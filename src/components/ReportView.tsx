import React, { useRef, useState } from 'react';
import { Printer, Check, CheckCheck, ShieldCheck, Clock3, FileOutput, FileText, LoaderCircle } from 'lucide-react';
import type { DesignErrorItem, SafetyItem, VeItem, ReviewItem } from '../types';
import { buildReportRows, isReviewSetApproved, confirmationUpdates, ReportRow } from '../lib/reportReview';
import { severityLabel } from '../lib/reviewClassification';
import { printApprovedDrawings } from '../lib/approvedDrawingPrint';
import { executionLabel } from '../lib/reviewNormalization';
import { printReportTable } from '../lib/reportTablePrint';
import './ReportView.css';

export const ReportView: React.FC<{
  reviewItems: ReviewItem[]; designErrors: DesignErrorItem[]; safetyItems: SafetyItem[]; veItems: VeItem[];
  onUpdateReviewItem: (review: ReviewItem) => Promise<boolean>;
}> = ({ reviewItems, designErrors, safetyItems, veItems, onUpdateReviewItem }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef(false);
  const [error, setError] = useState('');
  const rows = buildReportRows(reviewItems, designErrors, safetyItems, veItems);
  const approved = isReviewSetApproved(reviewItems, rows);
  const allConfirmed = rows.length > 0 && rows.every(row => row.confirmation === 'confirm');
  const confirmed = rows.filter(row => row.confirmation === 'confirm').length;
  const progress = rows.length ? Math.round(confirmed / rows.length * 100) : approved ? 100 : 0;

  const saveConfirmations = async (targets: ReportRow[], checked: boolean) => {
    if (savingRef.current || exportRef.current) return;
    const updates = confirmationUpdates(reviewItems, targets, checked);
    if (!updates.length) return;
    savingRef.current = true; setSaving(true); setError('');
    const failed: string[] = [];
    try {
      for (const review of updates) {
        try { if (!await onUpdateReviewItem(review)) failed.push(review.fileName); }
        catch { failed.push(review.fileName); }
      }
      if (failed.length) setError(failed.length + '개 문서의 확인 상태를 저장하지 못했습니다 (' + failed.join(', ') + '). 저장된 항목은 유지됩니다. 다시 시도해 주세요.');
    } finally { savingRef.current = false; setSaving(false); }
  };
  const print = async (issue = false) => {
    if (!reportRef.current || savingRef.current || exportRef.current || (issue && !approved)) return;
    if (!issue) { printReportTable(reportRef.current); return; }
    exportRef.current = true; setExporting(true); setError('');
    try { await printApprovedDrawings(reviewItems); }
    catch (error) { setError(error instanceof Error ? error.message : '도면 출력에 실패했습니다.'); }
    finally { exportRef.current = false; setExporting(false); }
  };
  return <div ref={reportRef} id="integrated-report" className="review-report">
    <div className="report-heading">
      <div className="report-title"><span className="report-eyebrow">ENGINEERING REVIEW</span><h1>통합 검토 보고서</h1><p>도면별 검토의견을 확인하고 공사용 도서 출도를 준비하세요.</p></div>
      <div className="report-actions" data-no-print>
        <button className="report-button secondary" disabled={saving} onClick={() => print()}><Printer size={16} />통합보고서 PDF</button>
        <button className="report-button issue" disabled={!approved || saving || exporting} onClick={() => print(true)}><FileOutput size={17} />{exporting ? '도면 생성 중…' : '공사용 도서 출도'}</button>
      </div>
    </div>
    <div className={'report-status-panel ' + (approved ? 'is-approved' : '')}>
      <div className="report-status-copy">
        <span className="report-status-icon">{approved ? <ShieldCheck size={30} /> : <Clock3 size={28} />}</span>
        <div><span className="report-eyebrow">REVIEW STATUS</span><div className="report-status-title">
          <strong data-testid="report-approval" data-approved={approved}>{approved ? 'Approved' : '확인 대기'}</strong>
          {approved && <span className="report-approved-seal"><Check size={13} />전체 확인 완료</span>}
        </div><p>{approved ? rows.length ? '주의·심각 의견의 확인이 저장되었습니다. Approved 도면을 출력할 수 있습니다.' : '분석 완료된 문서의 모든 의견이 적절합니다. Approved 도면을 출력할 수 있습니다.' : '주의·심각 의견을 모두 Confirm으로 저장하면 출도 버튼이 활성화됩니다.'}</p></div>
      </div>
      <div className="report-progress"><div><span>확인 진행률</span><strong>{progress}%</strong></div>
        <div className="report-progress-track" role="progressbar" aria-label="검토 확인 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: progress + '%' }} /></div>
        <p>{confirmed} / {rows.length}개 의견 확인</p>
      </div>
    </div>
    <div className="report-summary">
      <div><FileText size={18} /><span>검토 문서</span><strong>{reviewItems.length}<small>건</small></strong></div>
      <div><span>주의·심각 의견</span><strong>{rows.length}<small>건</small></strong></div>
      <div className="confirmed"><CheckCheck size={18} /><span>Confirm</span><strong>{confirmed}<small>건</small></strong></div>
      <div><span>확인 필요</span><strong>{rows.length - confirmed}<small>건</small></strong></div>
    </div>
    <div className="report-table-toolbar">
        <div><h2>검토의견 확인표</h2><p>주의·심각 의견만 표시합니다. 파란색 적절 의견은 도면 워크스페이스에서 확인하세요.</p></div>
      <div className="report-actions" data-no-print><span role="status" className="report-saving">{saving && <><LoaderCircle size={14} className="animate-spin" />저장 중…</>}</span>
        <button className="report-button confirm-all" aria-pressed={allConfirmed} disabled={saving || exporting || !rows.length} onClick={() => saveConfirmations(rows, !allConfirmed)}><CheckCheck size={16} />{allConfirmed ? '전체 Confirm 해제' : '전체 일괄 Confirm'}</button>
      </div>
    </div>
    {error && <p data-no-print role="alert" className="report-error">{error}</p>}
    <div className="report-scroll">
      <table aria-label="통합 검토의견 확인표">
        <colgroup><col style={{ width: '5%' }} /><col style={{ width: '16%' }} /><col style={{ width: '8%' }} /><col style={{ width: '30%' }} /><col style={{ width: '24%' }} /><col style={{ width: '9%' }} /><col style={{ width: '8%' }} /></colgroup>
        <thead><tr>{['번호', '도면 / 페이지', '분야', '검토의견', '조치 / 근거', 'AI 판정', 'Confirm'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.reviewId + ':' + row.key} data-testid="opinion-row" data-confirmed={row.confirmation === 'confirm'}>
          <td className="report-number">{String(index + 1).padStart(2, '0')}</td>
          <td><b className="report-file">{row.fileName}</b><span className="report-page">{row.pageNumber ? 'PAGE ' + String(row.pageNumber).padStart(2, '0') : '페이지 미확인'}</span></td>
          <td><span className="report-category" data-category={row.category}>{row.category}</span></td>
          <td><p className="report-opinion">{row.opinion}</p><details className="report-evidence"><summary data-no-print>증거 데이터 보기</summary><p><b>증거</b> {row.evidence || '미확인'}</p></details></td>
          <td><p className="report-action">{row.action || '조치 내용 미기재'}</p><p className="report-basis">{row.basis || '근거 확인 필요'}</p></td>
          <td><span className="report-verdict" data-verdict={row.severity === 'CRITICAL' ? 'FAIL' : 'NEEDS_CONFIRMATION'}>{severityLabel(row.severity)}</span></td>
          <td className="report-confirm-cell"><label className="report-confirm" title={row.confirmation === 'confirm' ? '확인 완료 · 클릭하여 해제' : '검토의견 확인'}>
            <input type="checkbox" aria-label={(index + 1) + ' Confirm'} checked={row.confirmation === 'confirm'} disabled={saving || exporting} onChange={event => saveConfirmations([row], event.target.checked)} />
            <span data-no-print className="report-confirm-mark"><Check size={17} strokeWidth={3} /></span>
          </label></td>
        </tr>)}{!rows.length && <tr><td colSpan={7} className="report-empty"><FileText size={30} /><b>주의·심각 검토의견이 없습니다</b><p>{approved ? '분석 완료된 문서의 모든 의견이 적절로 분류되었습니다.' : '도면 분석 결과를 확인하세요.'}</p></td></tr>}</tbody>
      </table>
    </div>
    <div className="report-document-status"><b>문서별 분석 상태</b>{reviewItems.map(review => <p key={review.id}><span>{review.fileName}</span>{executionLabel(review.execution)}{review.execution?.synthesisError ? ' · ' + review.execution.synthesisError : ''}</p>)}</div>
    <div className="report-footer"><span>AI ENG AGENT · ENGINEERING REVIEW</span><span>Confirm은 검토의견의 확인 상태이며 AI 판정을 변경하지 않습니다.</span></div>
  </div>;
};
