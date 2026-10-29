import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import express from 'express';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReviewRouter } from '../local-review-store';
import review from '../api/gemini/review-drawing';
import synthesize from '../api/gemini/synthesize-review';
import status from '../api/backend-status';
import estimateVe from '../api/gemini/estimate-ve';

async function listen(app: express.Express) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${(server.address() as any).port}` };
}
function twoPagePdf(count = 2) {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [' + Array.from({ length: count }, (_, i) => (i + 3) + ' 0 R').join(' ') + '] /Count ' + count + ' >>', ...Array(count).fill('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>')];
  let text = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((o, i) => { offsets.push(text.length); text += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = text.length; text += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(text);
}
test('browser upload, evidence, partial pages, restoration, same-name isolation and deletion', { timeout: 120000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-browser-'));
  const proxy = express(); proxy.use(express.json({ limit: '50mb' }));
  proxy.post('/gpgpta01-gpt/v1beta/models/:model', (req, res) => {
    const isImage = req.body.contents?.[0]?.parts?.some((p: any) => p.inlineData);
    const data = isImage ? { drawingTitle: '시험 도면', summary: '추가 확인 필요', designItems: [{ title: '위치 미확인 의견', description: '설계조건 확인', evidence: '원본 치수 미확인', status: 'NEEDS_CONFIRMATION' }, { title: '원점 의견', description: '원점 확인', evidence: '원점', status: 'PASS', xPercent: 0, yPercent: 0 }, { title: '추가 의견 A', description: '배치 확인', evidence: '자료 A', status: 'NEEDS_CONFIRMATION' }, { title: '추가 의견 B', description: '간섭 확인', evidence: '자료 B', status: 'NEEDS_CONFIRMATION' }], safetyItems: [], veItems: [] } : { summary: '일부 페이지 누락: 추가 검토 필요' };
    res.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(data) }] }, finishReason: 'STOP' }] });
  });
  const mock = await listen(proxy); const originalEnv = { ...process.env };
  process.env.GEMINI_API_KEY = 'browser-test-key'; process.env.GOOGLE_GEMINI_BASE_URL = mock.url + '/gpgpta01-gpt'; process.env.GEMINI_MODELS = 'gemini-3.5-flash';
  process.env.GOOGLE_CLOUD_VISION_API_KEY = ''; process.env.GOOGLE_CLOUD_VISION_USE_ADC = '';
  const app = express(); app.use(express.json({ limit: '50mb' })); app.use('/api/local/reviews', createReviewRouter(root));
  app.post('/api/gemini/review-drawing', (req, res) => req.body.pageNumber === 2 ? res.status(400).json({ error: '시험용 페이지 실패' }) : review(req as any, res as any));
  app.post('/api/gemini/synthesize-review', (req, res) => req.body.fileName === 'partial.pdf' ? res.status(502).json({ error: '시험용 종합 실패' }) : synthesize(req as any, res as any));
  app.get('/api/backend-status', (req, res) => status(req as any, res as any)); app.use(express.static('dist'));
  const host = await listen(app);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message)); await page.goto(host.url);
    await page.getByRole('button', { name: /새 문서 검토/ }).click();
    const image = { name: 'same.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64') };
    const drawingPng = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1200, 800);
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 2; ctx.strokeRect(45, 45, 1110, 710);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 4; ctx.strokeRect(180, 180, 780, 440);
      for (const x of [440, 700]) { ctx.beginPath(); ctx.moveTo(x, 180); ctx.lineTo(x, 620); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(180, 400); ctx.lineTo(960, 400); ctx.stroke();
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(210, 290); ctx.lineTo(920, 290); ctx.stroke();
      for (const x of [300, 540, 810]) { ctx.beginPath(); ctx.arc(x, 290, 12, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#475569'; ctx.font = '20px sans-serif';
      ctx.fillText('FIRE PROTECTION PLAN / REVIEW SAMPLE', 70, 95);
      ctx.font = '16px sans-serif'; ctx.fillText('DRAWING FP-001    |    SCALE 1:100', 740, 730);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    image.buffer = Buffer.from(drawingPng, 'base64');
    await page.locator('input[type=file]').setInputFiles(image);
    await expect.poll(async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records.length).toBe(1);
    await expect(page.getByText('분석 완료', { exact: true }).first()).toBeVisible();
    await page.locator('input[type=file]').setInputFiles(image);
    await expect.poll(async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records.length).toBe(2);
    await page.locator('input[type=file]').setInputFiles({ name: 'partial.pdf', mimeType: 'application/pdf', buffer: twoPagePdf() });
    await expect.poll(async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records.length, { timeout: 20000 }).toBe(3);
    const { records } = await (await fetch(host.url + '/api/local/reviews')).json();
    const partial = records.find((r: any) => r.bundle.uploadFile.name === 'partial.pdf');
    assert.ok(partial.bundle.reviewItem.execution, (await page.getByRole('alert').allTextContents()).join(' / '));
    assert.equal(partial.bundle.reviewItem.execution.state, 'partial');
    assert.equal(partial.bundle.reviewItem.execution.failedPages[0].pageNumber, 2);
    assert.match(partial.bundle.reviewItem.execution.synthesisError, /시험용 종합 실패/);
    assert.equal(partial.bundle.reviewItem.markups[0].xPercent, undefined);
    assert.equal(partial.bundle.reviewItem.markups[1].xPercent, 0);
    assert.equal(partial.bundle.reviewItem.markups[0].findingStatus, 'NEEDS_CONFIRMATION');
    assert.match(partial.bundle.uploadFile.fileDataUrl, /^\/api\/local\/reviews\//);
    await page.reload(); await expect(page.getByText('partial.pdf', { exact: true }).first()).toBeVisible();
    await page.getByRole('row').filter({ hasText: 'partial.pdf' }).first().click();
    await page.locator('textarea').first().fill('저장 실패 확인 메모');
    await page.route('**/api/local/reviews/*', async route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{\"error\":\"disk full\"}' }) : route.continue());
    await page.getByRole('button', { name: '검토의견 저장' }).click();
    await expect(page.getByText(/수정사항이 저장되지 않았습니다/)).toBeVisible();
    await expect(page.getByText('저장되었습니다!', { exact: true })).toHaveCount(0);
    await page.unroute('**/api/local/reviews/*');
    await page.getByRole('button', { name: '검토의견 저장' }).click();
    await expect(page.getByText('저장되었습니다!', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /도면 워크스페이스/ }).first().click();
    await expect(page.getByRole('heading', { name: '도면 검토 워크스페이스' })).toBeVisible();
    const workspace = page.locator('.review-workspace-grid');
    await expect(workspace.getByTestId('drawing-stage')).toHaveCSS('background-color', 'rgb(237, 242, 247)');
    await workspace.getByRole('button', { name: '다음', exact: true }).click();
    await expect(workspace.getByTestId('drawing-page')).toHaveText('2 / 2');
    await workspace.getByRole('button', { name: /same.png/ }).first().click();
    await expect.poll(() => workspace.locator('[data-testid="drawing-sheet"] img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1200);
    await expect(workspace.getByTestId('drawing-marker')).toHaveText('2');
    await workspace.getByTestId('drawing-marker').click();
    await expect(workspace.getByTestId('drawing-callout')).toBeVisible();
    const artifactDir = process.env.UI_REVIEW_ARTIFACT_DIR;
    if (artifactDir) { await fs.mkdir(artifactDir, { recursive: true }); await page.screenshot({ path: path.join(artifactDir, 'workspace.png') }); }
    await workspace.getByRole('button', { name: /partial.pdf/ }).click();
    await expect(workspace.getByTestId('drawing-page')).toHaveText('1 / 2');
    await expect(page.getByText(/위치 미확인/).first()).toBeVisible();
    await page.context().addInitScript(() => { window.print = () => {}; });
    const opened = page.waitForEvent('popup');
    await page.getByRole('button', { name: 'PDF 출력', exact: true }).click();
    const report = await opened;
    await expect(report.locator('.marker')).toHaveCount(1);
    await expect(report.locator('.marker')).toHaveText('2');
    assert.equal(await report.locator('.marker').evaluate((element: HTMLElement) => element.style.left), '0%');
    await expect(report.getByText(/부분 완료/).first()).toBeVisible();
    await report.close();
    const opinionsOpened = page.waitForEvent('popup');
    await page.getByRole('button', { name: '검토의견 PDF', exact: true }).click();
    const opinions = await opinionsOpened;
    await expect(opinions.getByRole('heading', { name: '도면 검토의견서' })).toBeVisible();
    await expect(opinions.locator('.sheet')).toHaveCount(0);
    await expect(opinions.locator('tbody tr')).toHaveCount(4);
    await opinions.close();
    await page.getByRole('button', { name: '주석 위치 지정', exact: true }).click();
    const sheet = workspace.getByTestId('drawing-sheet');
    const bounds = await sheet.boundingBox();
    await sheet.click({ position: { x: bounds!.width * .4, y: bounds!.height * .4 } });
    await expect(page.getByRole('button', { name: '주석 위치 수정', exact: true })).toBeEnabled();
    await expect(workspace.getByTestId('drawing-marker')).toHaveCount(2);
    const positioned = await (await fetch(host.url + '/api/local/reviews/' + partial.id)).json();
    assert.ok(Math.abs(positioned.bundle.reviewItem.markups[0].xPercent - 40) < 1);
    assert.equal(positioned.bundle.reviewItem.markups[0].pageNumber, 1);
    await page.getByRole('button', { name: '워크스페이스 닫기' }).click();
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.getByTestId('opinion-row')).toHaveCount(9);
    await expect(page.getByTestId('report-approval')).toHaveText('확인 대기');
    const issue = page.getByRole('button', { name: '공사용 도서 출도', exact: true });
    const confirmAll = page.getByRole('button', { name: /전체 (일괄 Confirm|Confirm 해제)/ });
    await expect(issue).toBeDisabled();
    await expect(page.getByRole('columnheader', { name: 'Non confirm', exact: true })).toHaveCount(0);
    const confirms = page.getByRole('checkbox', { name: /^\d+ Confirm$/ });
    // A stopped server must leave bulk confirmations unsaved and explain how to reconnect.
    await page.route('**/api/local/reviews/*', async route => route.request().method() === 'PUT' ? route.abort('connectionrefused') : route.continue());
    await confirmAll.click();
    await expect(page.getByText(/로컬 서버에 연결할 수 없습니다.*start-local.bat/)).toBeVisible();
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(0);
    await expect(issue).toBeDisabled();
    await expect(confirmAll).toBeEnabled();
    await page.unroute('**/api/local/reviews/*');
    await page.route('**/api/local/reviews/*', async route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{}' }) : route.continue());
    await confirms.nth(0).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(confirms.nth(0)).not.toBeChecked();
    await page.unroute('**/api/local/reviews/*');
    await confirms.nth(0).click();
    await expect(confirms.nth(0)).toBeChecked();
    await expect(page.locator('.report-confirm-mark').first()).toHaveCSS('background-color', 'rgb(20, 166, 113)');
    // One failed document must not undo other saves or allow issuance.
    await page.route('**/api/local/reviews/*', async route => route.request().method() === 'PUT' && route.request().url().endsWith('/' + partial.id) ? route.fulfill({ status: 500, body: '{}' }) : route.continue());
    await confirmAll.click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(issue).toBeDisabled();
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(7);
    await page.unroute('**/api/local/reviews/*');
    await confirmAll.click();
    await expect(page.getByTestId('report-approval')).toHaveText('Approved');
    await expect(issue).toBeEnabled();
    await expect(confirmAll).toBeEnabled();
    await expect(confirmAll).toHaveText('전체 Confirm 해제');
    await confirmAll.click();
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(0);
    await expect(issue).toBeDisabled();
    await page.reload();
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.locator('input[type=checkbox]:checked')).toHaveCount(0);
    await confirmAll.click();
    await expect(page.getByTestId('report-approval')).toHaveText('Approved');
    if (artifactDir) await page.screenshot({ path: path.join(artifactDir, 'report-approved.png'), fullPage: true });
    await page.reload();
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.getByTestId('report-approval')).toHaveText('Approved');
    const printed = page.waitForEvent('popup');
    await page.getByRole('button', { name: '통합보고서 PDF' }).click();
    const integrated = await printed;
    await expect(integrated.getByTestId('report-approval')).toHaveText('Approved');
    await expect(integrated.locator('tbody tr')).toHaveCount(9);
    assert.equal(await integrated.locator('.check-mark').filter({ hasText: '☑' }).count(), 9);
    await integrated.close();
    const issued = page.waitForEvent('popup');
    await issue.click();
    const issueSheet = await issued;
    await expect(issueSheet.locator('#approved-download')).toBeVisible();
    await expect(issueSheet.locator('table')).toHaveCount(0);
    const issuedBytes = await issueSheet.evaluate(async () => Array.from(new Uint8Array(await (await fetch((document.querySelector('#approved-download') as HTMLAnchorElement).href)).arrayBuffer())));
    const issuedPdf = await PDFDocument.load(new Uint8Array(issuedBytes));
    assert.equal(issuedPdf.getPageCount(), 4);
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfTask = pdfjs.getDocument({ data: new Uint8Array(issuedBytes), useSystemFonts: true });
    const issuedDocument = await pdfTask.promise;
    for (let i = 1; i <= issuedDocument.numPages; i++) {
      const text = (await (await issuedDocument.getPage(i)).getTextContent()).items.map((item: any) => item.str || '').join(' ');
      assert.match(text, /Approved/); assert.doesNotMatch(text, /설계조건 확인|원점 확인|배치 확인|간섭 확인/);
    }
    await pdfTask.destroy();
    if (artifactDir) {
      await fs.writeFile(path.join(artifactDir, 'approved-drawings.pdf'), new Uint8Array(issuedBytes));
    }
    await issueSheet.close();
    await page.getByRole('checkbox', { name: '1 Confirm', exact: true }).click();
    await expect(page.getByRole('checkbox', { name: '1 Confirm', exact: true })).not.toBeChecked();
    await expect(page.getByTestId('report-approval')).toHaveText('확인 대기');
    await expect(issue).toBeDisabled();
    await page.reload();
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.getByRole('checkbox', { name: '1 Confirm', exact: true })).not.toBeChecked();
    await expect(issue).toBeDisabled();
    assert.deepEqual(errors, []);
    const same = records.filter((r: any) => r.bundle.uploadFile.name === 'same.png');
    await fetch(`${host.url}/api/local/reviews/${same[0].id}`, { method: 'DELETE' });
    await page.reload();
    await expect.poll(async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records.length).toBe(2);
    assert.equal((await fetch(`${host.url}/api/local/reviews/${same[1].id}`)).status, 200);
  } finally {
    await browser.close(); host.server.close(); mock.server.close(); process.env = originalEnv;
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true });
  }
});
test('legacy PDFs share the light canvas, reset pages, and print full opinion evidence', { timeout: 60000 }, async () => {
  const structuralEvidence = '시험용 구조검토 근거: 부재 C1, 단면 H-300, 출처 구조계산서 1페이지 표 2.\n지배 하중조합 LC3, 문서 기재 조합응력비 0.82 / 허용비 1.00. 계산서 기재값의 비교이며 독립 재계산 결과가 아닙니다. 적용 조합식과 상세 입력조건은 추가 확인 필요.\nFULL_EVIDENCE_TEXT';
  const makeRecord = (id: string, count: number) => {
    const fileName = count === 2 ? 'long.pdf' : 'short.pdf';
    const shared = { documentId: id, projectId: 'POSCO-PLANT-01', drawingTitle: fileName,
      fileDataUrl: 'data:application/pdf;base64,' + twoPagePdf(count).toString('base64'),
      markups: [{ id: 'm1', title: '검토 항목', comment: '긴 검토 내용 '.repeat(40) + 'LAST_OPINION_TEXT', evidence: structuralEvidence, correctiveAction: '보완 조치 '.repeat(30) + 'LAST_ACTION_TEXT', codeClause: '기술 기준 '.repeat(30) + 'LAST_BASIS_TEXT', findingStatus: 'NEEDS_CONFIRMATION', severity: 'WARNING', pageNumber: 1 }],
      execution: { state: 'complete', totalPages: count, successfulPages: Array.from({ length: count }, (_, i) => i + 1), failedPages: [], partialPages: [] } };
    return { schemaVersion: 1, id, bundle: { uploadFile: { ...shared, id: 'up-' + id, name: fileName, type: 'PDF', status: '분석 완료' },
      reviewItem: { ...shared, id: 'rev-' + id, fileName, fileType: 'PDF', reviewType: '도면 검토', status: '주의', result: '검토 완료' }, designErrors: [], safetyItems: [], veItems: [] } };
  };
  const app = express();
  app.get('/api/local/reviews', (_req, res) => res.json({ records: [makeRecord('legacy-long', 2), makeRecord('legacy-short', 1)], errors: [] }));
  app.use(express.static('dist'));
  const host = await listen(app);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.context().addInitScript(() => { window.print = () => {}; });
    await page.goto(host.url);
    const titleImage = page.getByRole('img', { name: 'AI설계검토Agent · Engineering Review Platform', exact: true });
    await expect(titleImage).toBeVisible();
    await expect.poll(() => titleImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1135);
    await page.getByRole('row').filter({ hasText: 'long.pdf' }).first().click();
    await page.getByRole('button', { name: /도면 워크스페이스/ }).first().click();
    const workspace = page.locator('.review-workspace-grid');
    await expect(workspace.getByTestId('review-evidence')).toHaveText(structuralEvidence);
    await expect(workspace.getByTestId('review-evidence')).toHaveCSS('white-space', 'pre-wrap');
    await expect(workspace.getByTestId('drawing-page')).toHaveText('1 / 2');
    await expect.poll(() => workspace.locator('[data-testid="drawing-sheet"] img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(300);
    await workspace.getByRole('button', { name: '다음', exact: true }).click();
    await expect(workspace.getByTestId('drawing-page')).toHaveText('2 / 2');
    await workspace.getByRole('button', { name: /short.pdf/ }).click();
    await expect(workspace.getByTestId('drawing-page')).toHaveText('1 / 1');
    await expect.poll(() => workspace.locator('[data-testid="drawing-sheet"] img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(300);
    await expect(workspace.getByTestId('drawing-stage')).toHaveCSS('background-color', 'rgb(237, 242, 247)');
    await expect(workspace.locator('object,iframe')).toHaveCount(0);
    await page.getByRole('button', { name: '워크스페이스 닫기' }).click();
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    const opened = page.waitForEvent('popup');
    await page.getByRole('button', { name: '통합보고서 PDF' }).click();
    const printed = await opened;
    for (const text of ['LAST_OPINION_TEXT', 'FULL_EVIDENCE_TEXT', 'LAST_ACTION_TEXT', 'LAST_BASIS_TEXT']) {
      await expect(printed.locator('body')).toContainText(text);
    }
    await expect(printed.locator('details[open]')).toHaveCount(2);
    await expect(printed.getByRole('columnheader', { name: 'Non confirm', exact: true })).toHaveCount(0);
    const artifactDir = process.env.UI_REVIEW_ARTIFACT_DIR;
    if (artifactDir) await printed.pdf({ path: path.join(artifactDir, 'report-print-sample.pdf'), preferCSSPageSize: true, printBackground: true });
  } finally { await browser.close(); host.server.close(); }
});



test('queued uploads retain individual reviews with no document cross-review requests', { timeout: 60000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-individual-'));
  const app = express(); app.use(express.json({ limit: '50mb' })); app.use('/api/local/reviews', createReviewRouter(root));
  const requests: any[] = []; let crossCalls = 0;
  app.post('/api/gemini/review-drawing', async (req, res) => {
    requests.push(req.body); await new Promise(resolve => setTimeout(resolve, 350));
    res.json({ success: true, data: { drawingTitle: req.body.fileName, summary: '개별 검토 완료', designItems: [{ title: 'B1 접합', description: 'B1 접합 볼트 확인 필요', evidence: 'B1 M20', status: 'NEEDS_CONFIRMATION' }], safetyItems: [], veItems: [] } });
  });
  app.post('/api/gemini/cross-review', (_req, res) => { crossCalls++; res.status(410).json({ error: 'removed' }); });
  app.get('/api/backend-status', (_req, res) => res.json({})); app.use(express.static('dist'));
  const host = await listen(app); const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage(); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    const records = async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records;
    const file = { name: 'same.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64') };
    await page.goto(host.url); await page.getByRole('button', { name: /새 문서 검토/ }).click();
    await expect(page.getByText('도면·구조계산서 통합검토', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: '구조계산서', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles(file);
    await expect.poll(() => requests.length).toBe(1);
    await page.getByRole('button', { name: '도면', exact: true }).click();
    await page.locator('input[type=file]').setInputFiles(file);
    await page.getByRole('button', { name: /대시보드/, exact: true }).first().click();
    await expect.poll(async () => (await records()).length).toBe(2);
    assert.deepEqual(requests.map(r => r.docCategory), ['구조계산서', '도면']);
    await page.getByRole('button', { name: /새 문서 검토/ }).click();
    await page.locator('input[type=file]').setInputFiles(file);
    await expect.poll(async () => (await records()).length).toBe(3);
    assert.equal(crossCalls, 0);
    for (const r of await records()) { assert.equal(r.bundle.reviewItem.structuralReview, undefined); assert.equal(r.bundle.reviewItem.markups.length, 1); }
    await page.reload(); await expect(page.getByTestId('dashboard-ocr-summary')).toHaveCount(3);
    for (const summary of await page.getByTestId('dashboard-ocr-summary').all()) {
      assert.ok(await summary.locator('p').count() <= 5);
      await expect(summary).toContainText('B1 접합 볼트 확인 필요');
      const bounds = await summary.boundingBox(); assert.ok(bounds!.height <= 120);
    }
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.getByText(/도면·계산서 통합검토가 필요합니다/)).toHaveCount(0);
    await page.getByRole('button', { name: '전체 일괄 Confirm' }).click();
    await expect(page.getByTestId('report-approval')).toHaveText('Approved');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); host.server.close(); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true }); }
});

test('VE shows reproducible savings, exports evidence, and persists supplemented totals into report opinions', { timeout: 90000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-ve-browser-'));
  const app = express(); app.use(express.json({ limit: '50mb' })); app.use('/api/local/reviews', createReviewRouter(root));
  app.post('/api/gemini/review-drawing', (_req, res) => res.json({ success: true, data: { designItems: [], safetyItems: [], veItems: [
    { title: '배관 최적화', description: '배관 최적화 조건 확인 필요', evidence: '도면 M-01', status: 'NEEDS_CONFIRMATION', costEstimate: { currency: 'KRW', scope: '동일 배관 공사', vatBasis: '부가세 제외', additionalCost: 50000, additionalCostBasis: '설계변경 견적', lines: [{ label: '배관', unit: 'm', beforeQuantity: 100, afterQuantity: 80, beforeUnitPrice: 20000, afterUnitPrice: 18000, quantitySource: 'M-01 2페이지', unitPriceSource: 'Q-01 3페이지' }] } },
    { title: '견적 미제공', description: '견적 미제공 조건 확인 필요', evidence: '물량 검토 필요', status: 'NEEDS_CONFIRMATION', impactKw: 9999999 }
  ] } }));
  app.get('/api/backend-status', (_req, res) => res.json({})); app.use(express.static('dist'));
  const host = await listen(app); const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }); const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(host.url); await page.getByRole('button', { name: /새 문서 검토/ }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 've.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64') });
    await expect.poll(async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records.length).toBe(1);
    await page.getByRole('button', { name: /원가 및 VE/ }).click();
    const valid = page.getByTestId('ve-cost-row').filter({ hasText: '배관 최적화 조건' });
    const missing = page.getByTestId('ve-cost-row').filter({ hasText: '견적 미제공 조건' });
    await expect(valid).toContainText('510,000원'); await expect(valid).not.toContainText('Q-01 3페이지');
    await expect(page.getByTestId('ve-cost-detail')).toHaveCount(0);
    const dialog = page.getByRole('dialog', { name: '원가절감 세부 산출내역' });
    await valid.getByRole('button', { name: '산출 근거 보기' }).click();
    await expect(dialog).toContainText('Q-01 3페이지');
    await expect(dialog).toContainText('100 m × 20,000원');
    await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    await expect(valid.getByRole('button', { name: '산출 근거 보기' })).toBeFocused();
    const checkbox = valid.getByRole('checkbox');
    await expect(checkbox).not.toBeChecked();
    await expect(missing.getByRole('checkbox')).toBeDisabled();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('0원');
    await expect(page.getByRole('button', { name: '채택 항목 CSV 내보내기' })).toBeDisabled();
    await page.route('**/api/local/reviews/*', route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{"error":"disk full"}' }) : route.continue());
    await checkbox.click();
    await expect(page.getByRole('alert')).toContainText('채택 상태를 저장하지 못했습니다');
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('0원');
    await page.unroute('**/api/local/reviews/*');
    await checkbox.click(); await expect(checkbox).toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('51만원');
    await expect(page.getByTestId('ve-adopted-before')).toHaveText('2,000,000원');
    await expect(page.getByTestId('ve-adopted-after')).toHaveText('1,490,000원');
    assert.ok(await page.getByTestId('ve-adopted-savings').evaluate(el => parseFloat(getComputedStyle(el).fontSize)) >= 40);
    await page.getByPlaceholder('VE 아이디어/근거 검색...').fill('견적 미제공');
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('51만원');
    await page.getByPlaceholder('VE 아이디어/근거 검색...').fill('');
    await expect(missing).toContainText('미산정'); await expect(missing).not.toContainText('9,999,999');
    const downloadReady = page.waitForEvent('download');
    await page.getByRole('button', { name: '채택 항목 CSV 내보내기' }).click();
    const download = await downloadReady; const csv = await fs.readFile((await download.path())!, 'utf8');
    assert.match(csv, /510000/); assert.match(csv, /100 m × 20,000원/); assert.match(csv, /Q-01 3페이지/); assert.doesNotMatch(csv, /견적 미제공/);
    await missing.getByRole('button', { name: '산출 근거 보기' }).click();
    await dialog.getByText('산출자료 보완·저장 (총액 비교)', { exact: true }).click();
    await dialog.getByLabel('변경 전 금액(원)', { exact: true }).fill('500000');
    await dialog.getByLabel('변경 후 총액(원)', { exact: true }).fill('0');
    await dialog.getByLabel('산출 근거·출처', { exact: true }).fill('견적 A/B 2페이지, 동일 범위 VAT 제외, 삭제 공정이며 추가비용 없음');
    await page.route('**/api/local/reviews/*', route => route.request().method() === 'PUT' ? route.fulfill({ status: 500, body: '{"error":"disk full"}' }) : route.continue());
    await dialog.getByRole('button', { name: '산출자료 저장' }).click();
    await expect(dialog.getByRole('alert')).toContainText('저장하지 못했습니다');
    await expect(missing).toContainText('미산정');
    await page.unroute('**/api/local/reviews/*');
    await dialog.getByRole('button', { name: '산출자료 저장' }).click();
    await expect(dialog).toHaveCount(0); await expect(missing).toContainText('500,000원');
    await page.reload(); await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await expect(page.getByTestId('ve-cost-row').filter({ hasText: '견적 미제공 조건' })).toContainText('500,000원');
    const records = (await (await fetch(host.url + '/api/local/reviews')).json()).records;
    const bundle = records[0].bundle;
    assert.equal(bundle.veItems[0].adoption.accepted, true);
    await expect(checkbox).toBeChecked();
    await expect(missing.getByRole('checkbox')).not.toBeChecked();
    await page.getByRole('button', { name: /대시보드/, exact: true }).first().click();
    await expect(page.getByTestId('dashboard-ve-savings')).toHaveText('51만원');
    await expect(page.getByTestId('dashboard-ve-summary')).toContainText('1,490,000원');
    await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await checkbox.click(); await expect(checkbox).not.toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('0원');
    await checkbox.click(); await expect(checkbox).toBeChecked();
    await valid.getByRole('button', { name: '산출 근거 보기' }).click();
    await dialog.getByText('산출자료 보완·저장 (총액 비교)', { exact: true }).click();
    await dialog.getByLabel('변경 후 총액(원)', { exact: true }).fill('1500000');
    await dialog.getByLabel('산출 근거·출처', { exact: true }).fill('변경 견적, 동일 범위, VAT 제외, 추가비용 포함');
    await dialog.getByRole('button', { name: '산출자료 저장' }).click();
    await expect(dialog).toHaveCount(0); await expect(checkbox).not.toBeChecked();
    await expect(valid).toContainText('산출 변경 · 재선택');
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('0원');
    await checkbox.click(); await expect(checkbox).toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('50만원');
    assert.equal(bundle.veItems[1].afterCostKw, 0); assert.equal(bundle.veItems[1].impactKw, 500000);
    assert.equal(bundle.reviewItem.markups.find((m: any) => m.comment.includes('견적 미제공')).veCost.afterCostKw, 0);
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.locator('#integrated-report')).toContainText('순절감금액: 500,000원');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); host.server.close(); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true }); }
});


test('existing VE gets a labelled LLM estimate with persisted assumptions, native prompt, retry and CSV', { timeout: 90000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-assumed-ve-'));
  const proxy = express(); proxy.use(express.json()); let nativeCalls = 0;
  proxy.post('/v1beta/models/:model', (req, res) => {
    const prompt = req.body.contents[0].parts.find((p: any) => p.text).text;
    assert.match(prompt, /VE_ASSUMPTION_ESTIMATE/); assert.match(prompt, /legacy.png/); assert.match(prompt, /기존 철골 검토/); nativeCalls++;
    res.json({ candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify({ calculationBasis: '기존 자료로 10개소 시나리오 가정', costEstimate: { currency: 'KRW', basisType: 'source-data', scope: '접합부 10개소 가정', vatBasis: '양쪽 부가세 제외 가정', lines: [{ label: '접합부 작업', unit: '개소', beforeQuantity: 10, afterQuantity: 10, beforeUnitPrice: 100000, afterUnitPrice: 70000, quantitySource: '10개소 가정', unitPriceSource: '계획 단가 가정' }], additionalCost: 50000, additionalCostBasis: '설계 확인비 가정', assumptions: ['10개소 작업과 단가를 가정'], missingInputs: ['실제 접합부 수량 및 견적'] } }) }] } }] });
  });
  const mock = await listen(proxy); const beforeEnv = { ...process.env };
  process.env.GEMINI_API_KEY = 'mock-key'; process.env.GOOGLE_GEMINI_BASE_URL = mock.url; process.env.GEMINI_MODELS = 'mock-model';
  const app = express(); app.use(express.json({ limit: '50mb' })); app.use('/api/local/reviews', createReviewRouter(root));
  let failEstimate = true;
  app.post('/api/gemini/estimate-ve', (req, res) => failEstimate ? res.status(502).json({ error: 'mock unavailable' }) : estimateVe(req as any, res as any));
  app.post('/api/gemini/review-drawing', (_req, res) => res.json({ success: true, data: { designItems: [], safetyItems: [], veItems: [{ description: '접합부 공법 비교', evidence: '기존 철골 검토', status: 'NEEDS_CONFIRMATION' }] } }));
  app.get('/api/backend-status', (_req, res) => res.json({})); app.use(express.static('dist'));
  const host = await listen(app); const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const records = async () => (await (await fetch(host.url + '/api/local/reviews')).json()).records;
    await page.goto(host.url); await page.getByRole('button', { name: /새 문서 검토/ }).click();
    await page.locator('input[type=file]').setInputFiles({ name: 'legacy.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=', 'base64') });
    await expect.poll(async () => (await records()).length).toBe(1);
    await page.getByRole('button', { name: /원가 및 VE/ }).click();
    const row = page.getByTestId('ve-cost-row');
    await row.getByRole('button', { name: 'LLM 가정 산출', exact: true }).click();
    await expect(page.getByText('LLM 가정 산출 저장 0/1건', { exact: false })).toBeVisible();
    await expect(row).toContainText('미산정');
    failEstimate = false;
    await page.getByRole('button', { name: '미산정 항목 LLM 가정 산출', exact: true }).click();
    await expect(row).toContainText('250,000원'); await expect(row).toContainText('LLM 가정 산출치');
    assert.equal(nativeCalls, 1);
    const bundle = (await records())[0].bundle;
    assert.equal(bundle.veItems[0].costBasisType, 'llm-assumption');
    assert.equal(bundle.veItems[0].costEstimate.basisType, 'llm-assumption');
    assert.equal(bundle.reviewItem.markups[0].veCost.costBasisType, 'llm-assumption');
    await page.reload(); await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await expect(page.getByTestId('ve-cost-row')).toContainText('250,000원');
    await page.getByTestId('ve-cost-row').getByRole('button', { name: '산출 근거 보기' }).click();
    await expect(page.getByTestId('ve-cost-detail')).toContainText('LLM 가정 산출치');
    await expect(page.getByTestId('ve-cost-detail')).toContainText('실제 접합부 수량 및 견적');
    await page.getByRole('button', { name: '산출내역 닫기' }).click();
    await row.getByRole('checkbox').click(); await expect(row.getByRole('checkbox')).toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('25만원');
    await page.reload(); await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await expect(row.getByRole('checkbox')).toBeChecked();
    const ready = page.waitForEvent('download'); await page.getByRole('button', { name: '채택 항목 CSV 내보내기' }).click();
    assert.match(await fs.readFile((await (await ready).path())!, 'utf8'), /LLM 가정 산출치/);
    await page.getByRole('button', { name: /통합 보고서 출력/ }).click();
    await expect(page.locator('#integrated-report')).toContainText('LLM 가정 산출치');
  } finally { await browser.close(); host.server.close(); mock.server.close(); process.env = beforeEnv; assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true }); }
});


test('manual VE adoption survives navigation and reload and shares dashboard totals', { timeout: 30000 }, async () => {
  const app = express(); app.get('/api/local/reviews', (_req, res) => res.json({ records: [] }));
  app.get('/api/backend-status', (_req, res) => res.json({})); app.use(express.static('dist'));
  const host = await listen(app); const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    await page.goto(host.url); await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await page.getByRole('button', { name: 'VE 아이디어 직접 추가' }).click();
    await page.getByPlaceholder('예: 배관 관로 최적화 및 연결 조인트 감소').fill('사용자 배관 제안');
    await page.locator('form input[type=number]').nth(0).fill('300000');
    await page.locator('form input[type=number]').nth(1).fill('200000');
    await page.locator('form textarea').fill('동일 범위 견적 A/B, 부가세 제외, 추가비용 포함');
    await page.getByRole('button', { name: '금액 분석표에 추가' }).click();
    const checkbox = page.getByTestId('ve-cost-row').getByRole('checkbox');
    await expect(checkbox).not.toBeChecked(); await checkbox.click(); await expect(checkbox).toBeChecked();
    await expect(page.getByTestId('ve-adopted-savings')).toHaveText('10만원');
    await page.getByRole('button', { name: /대시보드/, exact: true }).first().click();
    await expect(page.getByTestId('dashboard-ve-savings')).toHaveText('10만원');
    await page.reload(); await expect(page.getByTestId('dashboard-ve-savings')).toHaveText('10만원');
    await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await expect(checkbox).toBeChecked(); await checkbox.click(); await expect(checkbox).not.toBeChecked();
    await page.reload(); await page.getByRole('button', { name: /원가 및 VE/ }).click();
    await expect(checkbox).not.toBeChecked(); await expect(page.getByTestId('ve-adopted-savings')).toHaveText('0원');
  } finally { await browser.close(); host.server.close(); }
});
