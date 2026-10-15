import React from 'react';
import { AlertTriangle, CheckCircle2, Coins, FileText, Printer, ShieldAlert } from 'lucide-react';
import { DesignErrorItem, SafetyItem, VeItem, ReviewItem } from '../types';

type ReportRow = {
  category: string;
  topic: string;
  finding: string;
  basis: string;
  action: string;
  status: string;
  tone: 'red' | 'amber' | 'green' | 'blue';
};

const short = (value: unknown, limit = 92) => {
  const text = String(value || '확인 필요').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};

const statusLabel = (value: unknown) => {
  const text = String(value || '확인 필요');
  if (text.includes('CRITICAL') || text.includes('심각')) return '심각';
  if (text.includes('WARNING') || text.includes('주의')) return '주의';
  if (text.includes('PASS') || text.includes('정상') || text.includes('양호')) return '양호';
  return '확인 필요';
};

const toneFor = (status: string): ReportRow['tone'] => {
  const label = statusLabel(status);
  return label === '심각' ? 'red' : label === '주의' ? 'amber' : label === '양호' ? 'green' : 'blue';
};

export const ReportView: React.FC<{
  reviewItems: ReviewItem[];
  designErrors: DesignErrorItem[];
  safetyItems: SafetyItem[];
  veItems: VeItem[];
}> = ({ reviewItems, designErrors, safetyItems, veItems }) => {
  const markups = reviewItems.flatMap((item) => item.markups || []);
  const rows: ReportRow[] = [
    ...designErrors.map((item) => ({ category: '설계', topic: item.description, finding: item.description, basis: item.codeClause || '법규 근거 확인 필요', action: item.suggestedFix || '설계도서 및 관련 분야 도면 대조', status: item.severity, tone: toneFor(item.severity) })),
    ...markups.map((item) => ({ category: item.category?.includes('VE') ? '원가·VE' : item.category?.includes('SAFETY') ? '안전' : '설계', topic: item.title, finding: item.comment, basis: item.codeClause || item.evidence || '법규 근거 확인 필요', action: item.correctiveAction || '현장 및 관련 도면 확인', status: item.severity, tone: toneFor(item.severity) })),
    ...safetyItems.map((item) => ({ category: '안전', topic: item.summary, finding: item.details || item.evidence || '안전 검토사항 확인 필요', basis: item.lawRegulation || '적용 법규 확인 필요', action: item.requiredConfirmation || '시공 전 안전조치 확인', status: item.findingStatus || item.severity, tone: toneFor(item.findingStatus || item.severity) })),
    ...veItems.map((item) => ({ category: '원가·VE', topic: item.description, finding: item.subDescription, basis: item.calculationBasis || item.evidence || '산출근거 확인 필요', action: item.status, status: item.findingStatus || item.status, tone: 'green' as const })),
  ];
  const serious = rows.filter((row) => statusLabel(row.status) === '심각').length;
  const warning = rows.filter((row) => statusLabel(row.status) === '주의').length;
  const status = serious ? '심각' : warning ? '주의' : '양호';
  const totalSavings = veItems.reduce((sum, item) => sum + (item.impactKw || 0), 0);
  const statusStyle = status === '심각' ? 'border-red-200 bg-red-50 text-red-800' : status === '주의' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const cardStyle = (tone: ReportRow['tone']) => ({ red: 'border-red-200 bg-red-50/70', amber: 'border-amber-200 bg-amber-50/70', green: 'border-emerald-200 bg-emerald-50/70', blue: 'border-blue-200 bg-blue-50/70' }[tone]);

  return <div id="integrated-report" className="mx-auto max-w-7xl rounded-2xl bg-slate-50 p-4 text-slate-800 print:bg-white print:p-0">
    <header className="flex items-center justify-between rounded-xl bg-gradient-to-r from-[#092a55] to-[#147da7] px-5 py-3 text-white print:rounded-none">
      <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">Ai ENG Agent · Engineering Review</p><h1 className="text-xl font-extrabold">통합 검토 보고서</h1><p className="text-[11px] text-blue-100">설계·안전·법규·원가절감 검토 결과 요약</p></div>
      <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#123b78] print:hidden"><Printer className="h-4 w-4" /> 출력</button>
    </header>

    <section className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2"><span className="text-[10px] font-bold text-slate-500">전체 검토</span><strong className="block text-xl text-[#123b78]">{rows.length}건</strong></div>
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2"><span className="text-[10px] font-bold text-red-700">심각</span><strong className="block text-xl text-red-800">{serious}건</strong></div>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"><span className="text-[10px] font-bold text-amber-700">주의</span><strong className="block text-xl text-amber-800">{warning}건</strong></div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"><span className="text-[10px] font-bold text-emerald-700">원가·VE</span><strong className="block text-xl text-emerald-800">₩{totalSavings.toLocaleString()}</strong></div>
      <div className={`col-span-2 rounded-lg border px-3 py-2 md:col-span-1 ${statusStyle}`}><span className="text-[10px] font-bold">종합 판단</span><strong className="block text-xl">{status}</strong></div>
    </section>

    <section className="mt-3 grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-xl border border-blue-200 bg-white p-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-extrabold text-[#123b78]">핵심 판단 요약</h2></div><p className="mt-2 text-xs leading-5 text-slate-600">{short(rows[0]?.finding || '검토 결과가 없습니다.', 260)}</p><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-red-100 px-2 py-1 text-red-700">설계 {designErrors.length + markups.filter((item) => !item.category?.includes('SAFETY') && !item.category?.includes('VE')).length}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">안전 {safetyItems.length + markups.filter((item) => item.category?.includes('SAFETY')).length}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">VE {veItems.length + markups.filter((item) => item.category?.includes('VE')).length}</span></div></div>
      <div className="rounded-xl border border-slate-200 bg-slate-100 p-3"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-extrabold text-[#123b78]">우선 조치사항</h2></div><ul className="mt-2 space-y-1 text-xs leading-5 text-slate-700">{rows.slice(0, 3).map((row, index) => <li key={`${row.topic}-${index}`} className="flex gap-1.5"><span className="font-bold text-blue-700">{index + 1}.</span><span>{short(row.action, 100)}</span></li>)}</ul></div>
    </section>

    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3"><div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-blue-600" /><h2 className="text-sm font-extrabold text-[#123b78]">분야별 검토의견 요약</h2><span className="ml-auto text-[10px] text-slate-500">전체 {rows.length}건</span></div>{rows.length ? <div className="grid grid-cols-1 gap-2 md:grid-cols-2">{rows.slice(0, 8).map((row, index) => <article key={`${row.category}-${row.topic}-${index}`} className={`rounded-lg border px-3 py-2.5 ${cardStyle(row.tone)}`}><div className="flex items-start gap-2"><span className="min-w-0 flex-1 text-xs font-extrabold text-slate-900">{index + 1}. [{row.category}] {short(row.topic, 76)}</span><span className="shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">{statusLabel(row.status)}</span></div><p className="mt-1 text-[11px] leading-4 text-slate-700">{short(row.finding, 130)}</p><div className="mt-1 flex gap-1 text-[10px] text-slate-500"><span className="font-bold">근거</span><span>{short(row.basis, 90)}</span></div></article>)}</div> : <p className="py-4 text-center text-xs text-slate-500">검토 결과가 없습니다.</p>}{rows.length > 8 && <p className="mt-2 text-center text-[10px] text-slate-500">상세 항목 {rows.length - 8}건은 도면 워크스페이스에서 확인할 수 있습니다.</p>}</section>
    <p className="mt-2 text-right text-[9px] text-slate-400">본 보고서는 AI 검토 지원 결과이며 최종 설계·감리 판단 전 전문가 확인이 필요합니다.</p>
    <style>{`@media print { @page { size: A4 portrait; margin: 8mm; } body { background: white !important; } #integrated-report { font-size: 9px; } #integrated-report article { break-inside: avoid; } }`}</style>
  </div>;
};
