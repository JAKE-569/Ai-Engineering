import test from 'node:test';
import assert from 'node:assert/strict';
import type { VeItem } from '../src/types';
import { isVeAdopted, veAdoptionFingerprint, veAdoptionSummary, largeVeAmount } from '../src/lib/veAdoption';

const item = (changes: Partial<VeItem> = {}): VeItem => ({ id: 've-1', documentId: 'doc-1', description: '배관 변경', beforeCostKw: 1000000, afterCostKw: 700000, calculationBasis: '동일 범위 견적 A/B, VAT 제외, 추가비용 포함', ...changes } as VeItem);
const adopt = (v: VeItem): VeItem => ({ ...v, adoption: { accepted: true, fingerprint: veAdoptionFingerprint(v), updatedAt: '2026-10-28' } });

test('only explicitly adopted calculated ideas contribute to costs and savings', () => {
  const plain = item(), selected = adopt(item({ id: 'selected' })), missing = adopt(item({ id: 'missing', afterCostKw: undefined }));
  assert.equal(isVeAdopted(plain), false);
  const summary = veAdoptionSummary([plain, selected, missing, { ...selected, adoption: { ...selected.adoption!, accepted: false } }]);
  assert.deepEqual(summary.adopted, [selected]);
  assert.equal(summary.before, 1000000); assert.equal(summary.after, 700000); assert.equal(summary.savings, 300000); assert.equal(summary.rate, 30);
  assert.equal(veAdoptionSummary([]).savings, 0);
});

test('adoption belongs to one document and item and expires when costs or basis change', () => {
  const selected = adopt(item());
  for (const change of [{ documentId: 'doc-2' }, { id: 've-2' }, { beforeCostKw: 1100000 }, { calculationBasis: '새 견적' }, { costBasisType: 'llm-assumption' as const }]) {
    assert.equal(isVeAdopted({ ...selected, ...change }), false, JSON.stringify(change));
  }
  assert.equal(isVeAdopted({ ...selected, status: '승인완료' }), true);
});

test('assumed savings remain separate and adopted cost increases retain their sign', () => {
  const summary = veAdoptionSummary([adopt(item()), adopt(item({ id: 'assumed', costBasisType: 'llm-assumption', afterCostKw: 1200000 }))]);
  assert.equal(summary.savings, 100000); assert.equal(summary.sourcedSavings, 300000); assert.equal(summary.assumedSavings, -200000); assert.equal(summary.assumedCount, 1);
  assert.deepEqual(largeVeAmount(7196000), { value: '719.6', unit: '만원' });
  assert.deepEqual(largeVeAmount(0), { value: '0', unit: '원' });
});
