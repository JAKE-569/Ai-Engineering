


export function printReportTable(element: HTMLElement) {
  const popup = window.open('', '_blank');
  if (!popup) { alert('팝업을 허용한 후 다시 출력하세요.'); return; }
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-no-print]').forEach(node => node.remove());
  // Full evidence stays in the printout, even when its screen disclosure is closed.
  clone.querySelectorAll('details').forEach(node => node.setAttribute('open', ''));
  clone.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach(input => {
    const mark = document.createElement('span'); mark.className = 'check-mark';
    mark.textContent = input.checked ? '☑' : '☐'; input.replaceWith(mark);
  });
  popup.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + '통합 검토 보고서' + '</title><style>' + `
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: 'Malgun Gothic', sans-serif; color: #253c51; font-size: 10px; line-height: 1.6; margin: 0; }
    h1 { font-size: 22px; margin: 4px 0; color: #16395b; } h2 { font-size: 14px; }
    p { margin: 4px 0; } svg { width: 18px; height: 18px; vertical-align: middle; }
    .report-heading { border-bottom: 2px solid #244969; padding-bottom: 12px; }
    .report-eyebrow,.eyebrow { color: #8094a6; font-size: 9px; letter-spacing: .14em; }
    .report-status-panel { display: flex; align-items: center; justify-content: space-between; margin: 15px 0; background: #f2f7fa; border: 1px solid #d5e1e9; border-radius: 8px; padding: 14px; }
    .is-approved { background: #effaf4; border-color: #b5ddc9; }
    .report-status-copy { display: flex; align-items: center; gap: 12px; }
    .report-status-icon svg { width: 32px; height: 32px; color: #10825b; }
    [data-testid=report-approval] { display: inline-block; font-size: 24px; margin-right: 12px; }
    [data-approved=true],.issue-approved { color: #08744f; font-weight: bold; }
    .report-approved-seal { color: #08744f; font-size: 10px; } .report-approved-seal svg { width: 12px; }
    .report-progress { text-align: right; } .report-progress strong { margin-left: 14px; }
    .report-summary { display: flex; gap: 28px; border-bottom: 1px solid #dce5ec; padding-bottom: 12px; }
    .report-summary > div { display: flex; align-items: center; gap: 6px; } small { margin-left: 3px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
    th,td { border: 1px solid #cbd7e0; padding: 7px; vertical-align: top; overflow-wrap: anywhere; font-size: 10px; }
    th { background: #edf3f8; text-align: left; } thead { display: table-header-group; } tr { break-inside: avoid; }
    .report-number,.report-confirm-cell { text-align: center; } .report-confirm-cell { vertical-align: middle; }
    .check-mark { font-size: 20px; color: #079666; }
    .report-page { display: block; color: #8b9ba8; font-size: 8px; } .report-file { color: #305879; }
    .report-opinion,.report-action,.report-evidence p,.report-basis { white-space: pre-wrap; }
    .report-evidence { color: #62788c; margin-top: 6px; } .report-basis { border-top: 1px dashed #dce4eb; padding-top: 5px; margin-top: 5px; color: #6c8192; }
    .report-document-status { margin-top: 18px; padding: 10px; background: #f7f9fb; } .report-document-status span { margin-right: 12px; }
    .report-footer { margin-top: 15px; border-top: 1px solid #dce5ec; padding-top: 8px; display: flex; justify-content: space-between; color: #8b9ba8; font-size: 8px; }
    .issue-cover { break-after: page; } .issue-cover h1 { border-bottom: 2px solid #1b684e; padding-bottom: 12px; }
    .issue-cover th:nth-child(1) { width: 6%; } .issue-cover th:nth-child(2) { width: 38%; }
  ` + '</style></head><body>' + clone.outerHTML + '<script>window.addEventListener("load",()=>setTimeout(()=>window.print(),200));</script></body></html>');
  popup.document.close();
}
