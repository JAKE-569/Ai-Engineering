import { ReviewMarkup } from '../types';

// Builds a printable review report (drawing pages with numbered markers, then
// the full list of review opinions) in a new window and opens the browser's
// print dialog, where "PDF로 저장" saves it as a PDF. Printing through the
// browser keeps Korean text intact without embedding a font in the bundle.

interface ReportInput {
  fileName: string;
  drawingTitle?: string;
  drawingNumber?: string;
  pages: string[];
  markups: (ReviewMarkup & { displayIndex?: number })[];
}

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));

const markerColor = (markup: ReviewMarkup) => {
  const category = markup.category || '';
  if (/원가|VE|절감|cost/i.test(category)) return '#059669';
  if (/안전|법규|safety/i.test(category)) return '#f59e0b';
  return markup.severity === 'CRITICAL' ? '#dc2626' : markup.severity === 'WARNING' ? '#f97316' : '#2563eb';
};

const severityLabel = (severity?: string) => severity === 'CRITICAL' ? '심각' : severity === 'WARNING' ? '주의' : '참고';

export function printReviewReport({ fileName, drawingTitle, drawingNumber, pages, markups }: ReportInput) {
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    alert('팝업이 차단되어 PDF 출력 창을 열 수 없습니다. 브라우저 주소창 오른쪽의 팝업 차단 아이콘에서 이 사이트를 허용한 뒤 다시 시도하세요.');
    return;
  }
  // Same rule as the workspace viewer: an item without a page belongs to page 1.
  const items = markups.map((markup, index) => ({ ...markup, number: markup.displayIndex || index + 1, page: Number(markup.pageNumber) > 0 ? Number(markup.pageNumber) : 1 }));
  const counts = { CRITICAL: 0, WARNING: 0, INFO: 0 } as Record<string, number>;
  for (const item of items) counts[item.severity in counts ? item.severity : 'INFO'] += 1;

  const pageSections = pages.map((src, index) => {
    const markers = items.filter((item) => item.page === index + 1).map((item) =>
      `<span class="marker" style="left:${Number(item.xPercent) || 50}%;top:${Number(item.yPercent) || 50}%;background:${markerColor(item)}">${item.number}</span>`).join('');
    return `<section class="drawing"><h2>도면 ${index + 1} / ${pages.length} 페이지</h2><div class="sheet"><img src="${escapeHtml(src)}" alt="" />${markers}</div></section>`;
  }).join('');

  const rows = items.map((item) => `<tr>
      <td class="num"><span class="dot" style="background:${markerColor(item)}">${item.number}</span></td>
      <td>${item.page}</td>
      <td>${escapeHtml(severityLabel(item.severity))}</td>
      <td><b>${escapeHtml(item.title)}</b><div class="muted">${escapeHtml(item.comment)}</div>${item.correctiveAction ? `<div class="muted">조치: ${escapeHtml(item.correctiveAction)}</div>` : ''}</td>
      <td>${escapeHtml(item.codeClause || '적용 법규 조항 미확인')}</td>
      <td>${escapeHtml(item.evidence || '')}</td>
    </tr>`).join('');

  const printedAt = new Date().toLocaleString('ko-KR');
  reportWindow.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8" />
<title>${escapeHtml(`${drawingTitle || fileName} 검토결과`)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 16px; font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; color: #0f172a; font-size: 11px; }
  header { border-bottom: 2px solid #0f2d55; padding-bottom: 8px; margin-bottom: 12px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0f2d55; }
  h2 { font-size: 13px; margin: 0 0 6px; color: #0f2d55; }
  .meta, .muted { color: #475569; }
  .summary { margin-top: 6px; display: flex; gap: 12px; font-weight: bold; }
  .drawing { break-after: page; }
  .sheet { position: relative; display: inline-block; max-width: 100%; border: 1px solid #cbd5e1; break-inside: avoid; }
  .sheet img { display: block; max-width: 100%; max-height: 140mm; }
  .marker { position: absolute; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; color: #fff; font-size: 10px; font-weight: bold; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,.5); }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; vertical-align: top; }
  th { background: #e2e8f0; white-space: nowrap; }
  th:nth-child(2), th:nth-child(3) { width: 48px; }
  tr { break-inside: avoid; }
  td.num { width: 34px; text-align: center; }
  .dot { display: inline-flex; width: 20px; height: 20px; border-radius: 50%; color: #fff; font-weight: bold; align-items: center; justify-content: center; }
  .hint { background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px; margin-bottom: 12px; }
  @media print { .hint { display: none; } body { padding: 0; } }
</style></head><body>
<div class="hint">인쇄 창의 <b>대상(프린터)</b>을 <b>"PDF로 저장"</b>으로 선택하면 PDF 파일로 저장됩니다. 창이 뜨지 않으면 Ctrl + P 를 누르세요.</div>
<header>
  <h1>도면 검토 결과 보고서</h1>
  <div class="meta">도면: ${escapeHtml(drawingTitle || fileName)}${drawingNumber ? ` · 도면번호 ${escapeHtml(drawingNumber)}` : ''} · 파일 ${escapeHtml(fileName)} · 출력 ${escapeHtml(printedAt)}</div>
  <div class="summary"><span>검토의견 ${items.length}건</span><span style="color:#dc2626">심각 ${counts.CRITICAL}</span><span style="color:#f97316">주의 ${counts.WARNING}</span><span style="color:#2563eb">참고 ${counts.INFO}</span></div>
</header>
${pageSections}
<section><h2>검토 의견 목록</h2>
${items.length ? `<table><thead><tr><th>번호</th><th>페이지</th><th>심각도</th><th>검토 의견</th><th>검토 근거(법규)</th><th>증거 데이터</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>이 도면에는 AI 검토 의견이 없습니다.</p>'}
</section>
<script>
  // Print once every drawing image has loaded, so the PDF is not blank.
  const images = Array.from(document.images);
  Promise.all(images.map((img) => img.complete ? null : new Promise((done) => { img.onload = img.onerror = done; }))).then(() => setTimeout(() => window.print(), 300));
</script>
</body></html>`);
  reportWindow.document.close();
}
