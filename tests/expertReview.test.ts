import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewText } from '../src/lib/reviewText';
import { normalizeReview } from '../src/lib/reviewNormalization';
import { classifyFinding } from '../src/lib/reviewClassification';
import { buildDocumentReviewContext, validateDocumentReviewContext } from '../src/lib/documentReviewContext';
import { buildReportRows } from '../src/lib/reportReview';
import { sourceReviewRules, sourceReviewClauses } from '../src/lib/reviewRuleContext';

test('structured engineering evidence and actions survive repeated normalization and report rows', () => {
  const item = { title: '가새 단면 대안', description: '문서의 축력비 0.008에 근거해 대체 단면을 비교한다.',
    evidence: { member: 6759, sourcePage: 20, values: { Pu: 3.326, phiPn: 427.680, torsion: 0 }, comparison: ['3.326 / 427.680 = 0.008', '60.7 < 200.0'] },
    recommendation: { action: '접합 상세와 규격 통합 대안을 비교', verification: '좌굴 및 접합 편심 확인' },
    verification: ['순단면 인장', '접합부 및 시공단계 안정성'], reviewBasis: 'conditional-design', status: 'PASS',
  };
  const first = normalizeReview({ designItems: [item], safetyItems: [], veItems: [] }, 20, 34);
  const second = normalizeReview(first, undefined, 34).designItems[0];
  assert.equal(second.evidence, first.designItems[0].evidence);
  assert.match(second.evidence, /6759/); assert.match(second.evidence, /427.68/); assert.match(second.evidence, /torsion: 0/);
  assert.doesNotMatch(second.evidence, /\[object Object\]/);
  assert.match(second.suggestedFix, /규격 통합/); assert.match(second.suggestedFix, /접합 편심/); assert.match(second.suggestedFix, /시공단계/);
  assert.equal(second.status, 'NEEDS_CONFIRMATION'); assert.equal(second.pageNumber, 20);
  assert.equal(reviewText([0, false, { member: 'B1' }]), '0\nfalse\n부재: B1');
  const rows = buildReportRows([{ id: 'r', documentId: 'doc', fileName: 'test.pdf', markups: [{ id: 'm', pageNumber: 20, category: '설계', comment: second.description, evidence: second.evidence, correctiveAction: second.correctiveAction, severity: second.severity, findingStatus: second.findingStatus, reviewBasis: second.reviewBasis }] }] as any, [], [], []);
  assert.match(rows[0].evidence, /6759/); assert.match(rows[0].action, /접합 편심/);
});

test('legal context requires source subjects or explicit codes, not generic structure words or numbers', () => {
  const source = '구조계산서 보 기둥 SS275 200 60.7 점검';
  assert.deepEqual(sourceReviewRules('건축', source), []);
  const clauses = [{ code: 'NFPC 101', trade: '소방', text: '소화기 200개', sourceStatus: 'EXCERPT' }, { code: 'KDS 14 31 10', trade: '구조', text: '강구조 부재', sourceStatus: 'SUMMARY' }];
  assert.deepEqual(sourceReviewClauses(clauses, [], source), []);
  assert.equal(sourceReviewClauses(clauses, [], source + ' KDS 14 31 10')[0].code, 'KDS 14 31 10');
  assert.ok(sourceReviewRules('소방', '스프링클러 헤드 간격 3 m').some(rule => rule.id === 'fire-sprinkler-spacing'));
  assert.ok(sourceReviewRules('건축', '굴착 및 흙막이').some(rule => rule.id === 'kds-structural-clearance'));
});

test('document checks remain bounded and design proposals never approve construction', () => {
  assert.equal(classifyFinding({ description: '문서 기재 축력비 0.008 < 1.000, 해당 비교는 기준 충족', status: 'PASS', reviewBasis: 'document-check' }).findingStatus, 'PASS');
  assert.deepEqual(classifyFinding({ description: '축강도비 0.008 < 1.000이다. 한계에 근접하지 않는다.', evidence: '조합번호는 별도 확인되지 않는다.', status: 'PASS', reviewBasis: 'document-check' }), { severity: 'INFO', findingStatus: 'PASS' });
  assert.equal(classifyFinding({ description: '축강도비가 한계에 근접한다.', status: 'NEEDS_CONFIRMATION', severity: 'CRITICAL', reviewBasis: 'document-check' }).severity, 'CRITICAL');
  assert.equal(classifyFinding({ description: '부재 내력 초과', status: 'FAIL', reviewBasis: 'document-check' }).findingStatus, 'FAIL');
  assert.deepEqual(classifyFinding({ title: 'Rmax=0.988 한계 근접', description: '한계 근접에 대한 CRITICAL 분류이며 실제 허용치 초과나 법규 위반을 의미하지 않는다.', status: 'NEEDS_CONFIRMATION', severity: 'CRITICAL', reviewBasis: 'document-check' }), { severity: 'CRITICAL', findingStatus: 'NEEDS_CONFIRMATION' });
  assert.equal(classifyFinding({ description: '연결재가 표시되지 않는다는 사실만으로 접합 누락이나 부적합을 뜻하지 않는다.', status: 'NEEDS_CONFIRMATION' }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(classifyFinding({ description: '연결재 누락은 부적합을 뜻하지 않는다. 하지만 부재 내력 초과가 확인되었다.', status: 'NEEDS_CONFIRMATION' }).findingStatus, 'FAIL');
  assert.deepEqual(classifyFinding({ title: 'Rmax=0.988 허용한계 근접', description: '이는 허용치 초과나 실제 설계 위반을 의미하지 않는다.', status: 'NEEDS_CONFIRMATION', severity: 'CRITICAL', reviewBasis: 'document-check' }), { severity: 'CRITICAL', findingStatus: 'NEEDS_CONFIRMATION' });
  assert.equal(classifyFinding({ description: '현재 근거로 처짐 초과를 단정할 수도 없다.', status: 'NEEDS_CONFIRMATION', reviewBasis: 'document-check' }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(classifyFinding({ description: '실제 구속이 해석 가정에 미달하는 경우 결과가 달라질 수 있다.', status: 'NEEDS_CONFIRMATION', reviewBasis: 'document-check' }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(classifyFinding({ description: '검토 후 성능 충족하는 대체 단면 적용', status: 'PASS', reviewBasis: 'conditional-design' }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(classifyFinding({ description: '기재된 내력 초과', status: 'FAIL', reviewBasis: 'conditional-design' }).findingStatus, 'FAIL');
});

test('same-document context prioritizes criteria over repeated member numbers and preserves boundary source pages', () => {
  const texts = ['CONTENTS Load Combination', 'Codes and Standards KDS 2022', 'Materials SS275 Fy 275', '허용 수직 처짐 L/300', ...Array.from({ length: 30 }, (_, i) => `Member No ${i} Material SS275 275000 0.000 0.008 ` + 'table '.repeat(500) + 'CHECKING_RESULTS_END')];
  const context = buildDocumentReviewContext(texts, 20);
  assert.equal(context.totalPages, 34); assert.equal(context.pages.length, 10);
  for (const page of [2, 3, 4, 19, 21]) assert.ok(context.pages.some(p => p.pageNumber === page));
  assert.ok(!context.pages.some(p => p.pageNumber === 20));
  assert.ok(context.pages.every(p => p.text.length <= 2000));
  assert.match(context.pages.find(p => p.pageNumber === 19)!.text, /CHECKING_RESULTS_END/);
  assert.equal(validateDocumentReviewContext(context, 34), true);
  assert.equal(validateDocumentReviewContext({ ...context, totalPages: 100 }, 34), false);
  assert.equal(validateDocumentReviewContext({ totalPages: 34, pages: [{ pageNumber: 35, text: 'x', truncated: false }] }, 34), false);
  assert.equal(validateDocumentReviewContext({ totalPages: 34, pages: [{ pageNumber: 1, text: 'x'.repeat(2001), truncated: true }] }, 34), false);
});
