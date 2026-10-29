import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateVeCost, normalizeVeCost, normalizeAssumedVeEstimate, veCostText, veCsv, VeCostEstimate } from '../src/lib/veCost';
import { classifyFinding } from '../src/lib/reviewClassification';
import { normalizeReview } from '../src/lib/reviewNormalization';
import { buildReportRows } from '../src/lib/reportReview';

const estimate: VeCostEstimate = { currency: 'KRW', scope: '동일 성능 배관 공사', vatBasis: '양쪽 모두 부가세 제외', priceDate: '2026-10-28', additionalCost: 50000, additionalCostBasis: '설계변경 견적 3항',
  lines: [{ label: '배관 재료·설치비', unit: 'm', beforeQuantity: 100, afterQuantity: 80, beforeUnitPrice: 20000, afterUnitPrice: 18000, quantitySource: '도면 M-01 2페이지', unitPriceSource: '견적 Q-01 3페이지' }] };

test('LLM assumptions calculate with outstanding verification inputs and retain the label through reports and manual edits', () => {
  const input = normalizeAssumedVeEstimate({ costEstimate: { ...estimate, basisType: 'source-data', assumptions: ['대상 구간 100m와 변경 후 80m, 단가는 계획 수준 가정'], missingInputs: ['실제 단가 견적'] } }, 'test-model');
  assert.equal(input.costBasisType, 'llm-assumption');
  assert.equal(input.impactKw, 510000);
  assert.equal(calculateVeCost(input).assumed, true);
  assert.match(veCostText(input), /LLM 가정 산출치/);
  assert.match(veCostText(input), /실제 적용 전 확인자료: 실제 단가 견적/);
  assert.match(veCsv([{ ...input, description: '가정 제안' }]), /LLM 가정 산출치/);
  assert.equal(classifyFinding({ title: '적절', veCost: input }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(calculateVeCost({ ...input, costEstimate: undefined }).assumed, true);
  assert.throws(() => normalizeAssumedVeEstimate({ costEstimate: { ...estimate, assumptions: [] } }, 'test'), /가정 이유/);
  assert.throws(() => normalizeAssumedVeEstimate({ costEstimate: { ...estimate, assumptions: ['가정'], additionalCost: null } }, 'test'), /불완전/);
});

test('VE calculates quantities and prices minus additional costs and preserves evidence', () => {
  const c = calculateVeCost({ costEstimate: estimate });
  assert.equal(c.before, 2000000); assert.equal(c.after, 1490000); assert.equal(c.savings, 510000); assert.equal(c.rate, 25.5);
  assert.match(veCostText({ costEstimate: estimate }), /100 m × 20,000원/);
  assert.match(veCostText({ costEstimate: estimate }), /견적 Q-01 3페이지/);
  const result = normalizeReview({ designItems: [], veItems: [{ title: '배관 최적화', costEstimate: estimate, impactKw: 99999999, status: 'NEEDS_CONFIRMATION' }] }, 2, 2);
  assert.equal(result.veItems[0].impactKw, 510000);
  assert.equal(result.veItems[0].costEstimate.lines[0].quantitySource, '도면 M-01 2페이지');
});

test('VE missing values and sources never become zero, estimates, or partial totals', () => {
  assert.equal(calculateVeCost({}).savings, undefined);
  assert.equal(calculateVeCost({ beforeCostKw: 1000, afterCostKw: 500 }).savings, undefined);
  assert.equal(normalizeVeCost({ beforeCostKw: 1000 }).beforeCostKw, 1000);
  for (const invalid of [null, '', false, -1, Infinity, '1억원']) {
    const c = calculateVeCost({ costEstimate: { ...estimate, lines: [{ ...estimate.lines[0], afterUnitPrice: invalid as any }] } });
    assert.equal(c.savings, undefined, String(invalid));
  }
  assert.equal(calculateVeCost({ costEstimate: { ...estimate, additionalCostBasis: '' } }).state, 'needs-input');
  assert.equal(calculateVeCost({ costEstimate: { ...estimate, lines: [{ ...estimate.lines[0], quantitySource: '' }] } }).state, 'needs-input');
  assert.equal(calculateVeCost({ costEstimate: { ...estimate, missingInputs: ['철거비 견적'] } }).savings, undefined);
});

test('VE zero costs and increased costs remain valid and CSV retains signed values and complete sources', () => {
  assert.equal(calculateVeCost({ beforeCostKw: 100, afterCostKw: 0, calculationBasis: '견적 A/B 동일 범위, 추가비용 없음, VAT 제외' }).savings, 100);
  const input = { description: '대안 "B", 보완', beforeCostKw: 0, afterCostKw: 300, calculationBasis: '견적 B\n동일 범위 / VAT 제외 / 추가비용 포함' };
  const c = calculateVeCost(input); assert.equal(c.savings, -300); assert.equal(c.rate, undefined);
  assert.match(veCostText(input), /비용 증가/);
  assert.match(veCsv([input]), /"-300"/);
  assert.match(veCsv([input]), /대안 ""B"", 보완/);
  assert.match(veCsv([{ description: '자료 없음' }]), /산정자료 필요/);
});

test('VE financial evidence appears in report rows and changed amounts revoke previous confirmation', () => {
  const review: any = { id: 'r', fileName: 'a.pdf', markups: [{ id: 'v', title: '배관 원가 검토', comment: '조건 확인 필요', category: '원가·VE', severity: 'WARNING', veCost: { costEstimate: estimate } }] };
  const [row] = buildReportRows([review]);
  assert.match(row.evidence, /순절감금액: 510,000원/);
  review.opinionConfirmations = { v: { choice: 'confirm', fingerprint: row.fingerprint } };
  review.opinionConfirmations['markup:v'] = review.opinionConfirmations.v;
  assert.equal(buildReportRows([review])[0].confirmation, 'confirm');
  review.markups[0].veCost.costEstimate = { ...estimate, additionalCost: 100000 };
  assert.equal(buildReportRows([review])[0].confirmation, null);
});
