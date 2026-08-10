import React from 'react';
import { DesignErrorItem, SafetyItem, VeItem, ReviewItem } from '../types';
import { Printer, FileText, ShieldAlert, Coins, AlertTriangle } from 'lucide-react';

const Cell = ({ children }: { children?: React.ReactNode }) => <td className="border-b border-slate-200 px-3 py-2 align-top text-[11px] leading-4 text-slate-700">{children || '확인 필요'}</td>;

export const ReportView: React.FC<{ reviewItems: ReviewItem[]; designErrors: DesignErrorItem[]; safetyItems: SafetyItem[]; veItems: VeItem[] }> = ({ reviewItems, designErrors, safetyItems, veItems }) => {
  const markups = reviewItems.flatMap((item) => item.markups || []);
  const rows = [
    ...designErrors.map((item) => ({ category: '설계', topic: item.description, finding: item.description, basis: item.codeClause || item.legalBasis, action: item.suggestedFix, status: item.severity })),
    ...markups.map((item) => ({ category: item.category || '설계', topic: item.title, finding: item.comment, basis: item.codeClause, action: item.recommendation, status: item.severity })),
    ...safetyItems.map((item) => ({ category: '안전', topic: item.summary, finding: item.details, basis: item.lawRegulation, action: item.requiredConfirmation, status: item.findingStatus || item.severity })),
    ...veItems.map((item) => ({ category: '원가·VE', topic: item.description, finding: item.subDescription, basis: item.calculationBasis, action: item.status, status: item.findingStatus || item.status })),
  ];
  return <div id="integrated-report" className="mx-auto max-w-6xl space-y-4 pb-8 print:max-w-none print:space-y-2 print:p-0">
    <header className="flex items-center justify-between rounded-xl bg-[#0f2d55] p-4 text-white print:rounded-none print:p-3">
      <div><h1 className="text-xl font-bold">FutureM Ai ENG 통합 검토 보고서</h1><p className="mt-1 text-xs text-blue-100">설계·안전·원가절감(VE) 통합 결과</p></div>
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#123b78]"><Printer className="h-4 w-4" /> 보고서 출력</button>
    </header>
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-lg border border-red-200 bg-red-50 p-3"><AlertTriangle className="mb-1 h-5 w-5 text-red-600" /><b className="text-xs text-red-900">설계 검토</b><strong className="mt-1 block text-xl text-red-700">{designErrors.length + markups.length}건</strong></div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3"><ShieldAlert className="mb-1 h-5 w-5 text-amber-600" /><b className="text-xs text-amber-900">안전 검토</b><strong className="mt-1 block text-xl text-amber-700">{safetyItems.length}건</strong></div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><Coins className="mb-1 h-5 w-5 text-emerald-600" /><b className="text-xs text-emerald-900">원가·VE</b><strong className="mt-1 block text-xl text-emerald-700">₩{veItems.reduce((sum, item) => sum + (item.impactKw || 0), 0).toLocaleString()}</strong></div>
    </div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3"><FileText className="h-5 w-5 text-blue-600" /><h2 className="text-base font-bold text-[#123b78]">검토 의견 요약</h2></div>
      {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse"><thead className="bg-slate-100 text-left text-[11px] font-bold text-slate-600"><tr><th className="px-3 py-2">분류</th><th className="px-3 py-2">검토 항목</th><th className="px-3 py-2">확인 내용</th><th className="px-3 py-2">법규·기술기준 / 산출근거</th><th className="px-3 py-2">권고 조치</th><th className="px-3 py-2">상태</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.category}-${index}`}><Cell><span className={`rounded px-2 py-1 text-[10px] font-bold ${row.category === '안전' ? 'bg-amber-100 text-amber-800' : row.category === '원가·VE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{row.category}</span></Cell><Cell><b>{row.topic}</b></Cell><Cell>{row.finding}</Cell><Cell>{row.basis}</Cell><Cell>{row.action}</Cell><Cell><span className="whitespace-nowrap rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{row.status || '확인 필요'}</span></Cell></tr>)}</tbody></table></div> : <p className="p-5 text-sm text-slate-500">현재 세션의 검토 결과가 없습니다.</p>}
    </section>
    <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } body { background: white !important; } #integrated-report { font-size: 9px; } #integrated-report table { page-break-inside: avoid; } #integrated-report button { display: none; } }`}</style>
  </div>;
};
