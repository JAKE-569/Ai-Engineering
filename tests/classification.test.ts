import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFinding, locateFinding, normalizeFinding } from '../src/lib/reviewClassification';
import { buildReportRows, confirmationUpdates, isReviewSetApproved } from '../src/lib/reportReview';
import { createApprovedDrawingPdf } from '../src/lib/approvedDrawingPrint';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { createHash } from 'node:crypto';

test('severity follows findings, with violations before positive language and uncertainty before approval', () => {
  for (const comment of ['적절하게 설계되었다.', '설비 배치 OK', '배관이 올바르게 설계되었습니다.', '기준을 초과하지 않으며 적절합니다.', '형상비 0.210으로 기준값 3.00 미만이므로 진동 검토 제외 기준 충족.']) {
    assert.equal(classifyFinding({ comment, severity: 'WARNING' }).severity, 'INFO', comment);
  }
  for (const comment of ['확인필요', '적절하지만 현장 확인 필요', '기준 초과 여부 확인 필요', '법규 상충 가능성 확인 필요', '적절하지 않은 것으로 추정됨']) {
    assert.equal(classifyFinding({ comment, severity: 'INFO' }).severity, 'WARNING', comment);
  }
  for (const comment of ['일부 배치는 적절하지만 법규와 상충됩니다.', '허용치 3m를 초과한 4m', '최소 기준 2m 미만으로 설계됨', '허용 한계에 근접함', '부재 검토 NG', '배치는 적절하지만 내력이 부족합니다.']) {
    assert.equal(classifyFinding({ comment }).severity, 'CRITICAL', comment);
  }
  assert.equal(classifyFinding({ comment: '허용 한계에 근접함' }).findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(classifyFinding({ comment: '기준은 3m 미만이어야 한다.' }).severity, 'WARNING');
});
test('coordinates recover from unique matching observations without guessing or crossing pages', () => {
  const item = { id: 'd1', title: '스프링클러 배관 간섭', pageNumber: 2 };
  const match = { id: 'v1', finding: '스프링클러 배관 간섭', pageNumber: 2, xPercent: 0, yPercent: 30 };
  assert.deepEqual(locateFinding(item, [match]), { xPercent: 0, yPercent: 30, pageNumber: 2 });
  assert.deepEqual(locateFinding(item, [{ ...match, pageNumber: 1 }]), {});
  assert.deepEqual(locateFinding(item, [match, { ...match, xPercent: 80 }]), {});
  assert.deepEqual(locateFinding({ ...item, visualFindingId: 'v2' }, [{ id: 'v2', pageNumber: 2, coordinateSpace: 'percent', bbox: { x: 20, y: 10, width: 10, height: 20 } }]), { xPercent: 25, yPercent: 20, pageNumber: 2 });
  assert.deepEqual(locateFinding(item, [{ ...match, xPercent: undefined, yPercent: undefined, bbox: [100, 200, 300, 400] }]), {});
  assert.equal(normalizeFinding({ comment: '적절합니다.', severity: 'WARNING' }).severity, 'INFO');
});
test('reports omit appropriate findings, bulk confirm can be undone, and empty or failed reviews are not approved', () => {
  const review: any = { id: 'one', documentId: 'one', fileName: 'one.pdf', execution: { state: 'complete' }, markups: [
    { id: 'ok', comment: '적절하게 설계됨', severity: 'WARNING' },
    { id: 'warn', comment: '치수 확인 필요', severity: 'INFO' },
    { id: 'critical', comment: '한계 근접', severity: 'WARNING' },
  ] };
  const rows = buildReportRows([review]);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(row => row.severity), ['WARNING', 'CRITICAL']);
  const confirmed = confirmationUpdates([review], rows, true);
  assert.equal(isReviewSetApproved(confirmed, buildReportRows(confirmed)), true);
  const cleared = confirmationUpdates(confirmed, buildReportRows(confirmed), false);
  assert.ok(buildReportRows(cleared).every(row => row.confirmation === null));
  assert.equal(isReviewSetApproved(cleared, buildReportRows(cleared)), false);
  assert.equal(isReviewSetApproved([], []), false);
  assert.equal(isReviewSetApproved([{ ...review, markups: [] }], []), false);
  assert.equal(isReviewSetApproved([{ ...review, markups: [review.markups[0]] }], []), true);
  assert.equal(isReviewSetApproved([{ ...review, execution: { state: 'failed' }, markups: [review.markups[0]] }], []), false);
});
test('approved drawing PDF preserves originals and stamps a dated seal at the displayed bottom right for every rotation', async () => {
  const original = await PDFDocument.create();
  const font = await original.embedFont(StandardFonts.Helvetica);
  original.addPage([840, 590]).drawText('ORIGINAL_DRAWING_A', { font, x: 50, y: 100 });
  const rotated = original.addPage([420, 590]); rotated.setRotation(degrees(90)); rotated.drawText('ORIGINAL_DRAWING_B', { font, x: 40, y: 80 });
  for (const angle of [180, 270]) {
    const cropped = original.addPage([560, 430]); cropped.setCropBox(30, 40, 500, 350); cropped.setRotation(degrees(angle));
    cropped.drawText('ORIGINAL_DRAWING_C', { font, x: 50, y: 100 });
  }
  const bytes = await original.save(); const hash = createHash('sha256').update(bytes).digest('hex');
  const source: any = { id: 'one', documentId: 'one', fileType: 'PDF', fileName: 'one.pdf', fileDataUrl: 'data:application/pdf;base64,' + Buffer.from(bytes).toString('base64'), markups: [{ comment: 'DO_NOT_PRINT_REVIEW_COMMENT' }] };
  const exported = await createApprovedDrawingPdf([source, { ...source }, { ...source, id: 'two', documentId: 'two' }], new Date('2026-10-26T16:00:00Z'));
  const pdf = await PDFDocument.load(exported);
  assert.equal(pdf.getPageCount(), 8);
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 840, height: 590 });
  assert.equal(pdf.getPage(1).getRotation().angle, 90);
  assert.deepEqual(pdf.getPage(2).getCropBox(), original.getPage(2).getCropBox());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loading = pdfjs.getDocument({ data: exported.slice(), useSystemFonts: true });
  const parsed = await loading.promise;
  try {
    for (let i = 1; i <= parsed.numPages; i++) {
      const page = await parsed.getPage(i);
      const items = (await page.getTextContent()).items as any[];
      const text = items.map((item: any) => item.str || '').join(' ');
      assert.match(text, /ORIGINAL_DRAWING_/);
      assert.match(text, /Approved/);
      assert.match(text, /2026\.10\.27/);
      const viewport = page.getViewport({ scale: 1 });
      const stamp = items.find(item => item.str === 'Approved');
      const date = items.find(item => item.str === '2026.10.27');
      for (const item of [stamp, date]) {
        const transform = pdfjs.Util.transform(viewport.transform, item.transform);
        assert.ok(transform[4] > viewport.width * .65 && transform[4] < viewport.width, 'stamp is on the right');
        assert.ok(transform[5] > viewport.height * .7 && transform[5] < viewport.height, 'stamp is at the bottom');
        assert.ok(transform[0] > 0 && Math.abs(transform[1]) < .001, 'stamp text stays upright');
      }
      assert.ok(viewport.convertToViewportPoint(stamp.transform[4], stamp.transform[5])[1] < viewport.convertToViewportPoint(date.transform[4], date.transform[5])[1], 'Approved is above the date');
      assert.doesNotMatch(text, /DO_NOT_PRINT_REVIEW_COMMENT/);
    }
  } finally { await loading.destroy(); }
  await assert.rejects(createApprovedDrawingPdf([{ ...source, fileDataUrl: undefined }]), /원본 도면/);
});
