import test from 'node:test';
import assert from 'node:assert/strict';
import { removeRetiredCrossReview } from '../src/lib/retiredCrossReview';
import { dashboardSummary } from '../src/lib/dashboardSummary';
import { buildReportRows, isReviewSetApproved } from '../src/lib/reportReview';

test('retired cross-review opinions and metadata are removed without changing individual reviews or VE choices', () => {
  const original: any = { bundle: { reviewItem: { id: 'r', fileName: 'drawing.pdf', docCategory: '도면', reviewSetId: 's', structuralReview: { state: 'failed' },
    execution: { state: 'complete' }, markups: [{ id: 'original', title: '접합 상세', comment: '확인 필요', severity: 'WARNING' }, { id: 'cross', title: '[통합검토]', crossReview: { outcome: 'UNRESOLVED' } }],
    opinionConfirmations: { 'markup:original': { choice: 'confirm', fingerprint: 'keep' }, 'markup:cross': { choice: 'confirm' } } },
    uploadFile: { fileDataUrl: '/api/local/reviews/r/assets/source.pdf', reviewSetName: '세트', markups: [{ id: 'cross', crossReview: { outcome: 'UNRESOLVED' } }] },
    veItems: [{ id: 've', impactKw: 7000000, adoption: { accepted: true, fingerprint: 'unchanged' } }] } };
  const cleaned = removeRetiredCrossReview(original);
  assert.equal(cleaned.bundle.reviewItem.markups.length, 1);
  assert.equal(cleaned.bundle.reviewItem.structuralReview, undefined);
  assert.equal(cleaned.bundle.reviewItem.reviewSetId, undefined);
  assert.deepEqual(cleaned.bundle.reviewItem.opinionConfirmations, { 'markup:original': original.bundle.reviewItem.opinionConfirmations['markup:original'] });
  assert.equal(cleaned.bundle.uploadFile.markups.length, 0);
  assert.equal(cleaned.bundle.uploadFile.fileDataUrl, original.bundle.uploadFile.fileDataUrl);
  assert.deepEqual(cleaned.bundle.veItems, original.bundle.veItems);
  assert.equal(original.bundle.reviewItem.markups.length, 2);
  assert.deepEqual(removeRetiredCrossReview(cleaned), cleaned);
  const rows = buildReportRows([cleaned.bundle.reviewItem]).map(r => ({ ...r, confirmation: 'confirm' as const }));
  assert.equal(isReviewSetApproved([cleaned.bundle.reviewItem], rows), true);
});

test('dashboard summarizes at most five short key findings, prioritizing failures and deduplicating', () => {
  const review: any = { result: '긴 원문 유지', execution: { state: 'partial' }, markups: [
    { title: '적절', comment: '자료 범위 내 적절', findingStatus: 'PASS' },
    ...Array.from({ length: 7 }, (_, i) => ({ comment: `부재 B${i} 접합 확인 필요. ` + '상세 근거 '.repeat(50), findingStatus: 'NEEDS_CONFIRMATION' })),
    { comment: '기초 내력 부족', findingStatus: 'FAIL' }, { comment: '기초 내력 부족', findingStatus: 'FAIL' }
  ] };
  const lines = dashboardSummary(review);
  assert.equal(lines.length, 5); assert.match(lines[0], /미완료/); assert.match(lines[1], /기초 내력 부족/);
  assert.ok(lines.every(s => s.length <= 85)); assert.equal(lines.filter(s => s.includes('기초 내력 부족')).length, 1);
  assert.equal(review.result, '긴 원문 유지');
  assert.deepEqual(dashboardSummary({ result: '주요 결과 한 문장. 두 번째 결과.' } as any), ['주요 결과 한 문장.', '두 번째 결과.']);
});

test('dashboard prefers actionable finding titles to cover descriptions without cutting document abbreviations', () => {
  const review: any = { markups: [
    { title: '구조설계 도면 표지 정보 확인', comment: '본 도면은 표지입니다.', findingStatus: 'NEEDS_CONFIRMATION' },
    { title: '기초 미확정 HOLD 구간 설계 반영 확인', comment: '긴 설명 '.repeat(100), findingStatus: 'NEEDS_CONFIRMATION', pageNumber: 3 },
    { title: '', comment: 'Doc No. 항목이 빈칸으로 작성되어 있습니다. 최종 확인하세요.', findingStatus: 'NEEDS_CONFIRMATION' },
    { title: '외부 장비 미접수 기초 설계 HOLD 구간 확인', comment: '별도 페이지의 동일 주제', findingStatus: 'NEEDS_CONFIRMATION', pageNumber: 20 }
  ] };
  const lines = dashboardSummary(review);
  assert.equal(lines.length, 3);
  assert.match(lines[0], /3·20p: 기초 미확정 HOLD 구간 설계 반영 확인/);
  assert.match(lines[1], /Doc No\. 항목이 빈칸으로 작성되어 있습니다\./);
  assert.match(lines[2], /표지/);
});
