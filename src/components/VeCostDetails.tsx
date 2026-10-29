import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { VeItem } from '../types';
import { calculateVeCost, won } from '../lib/veCost';

export function VeCostDetails({ item, onClose, onSave }: { item: VeItem; onClose: () => void; onSave?: (item: VeItem) => Promise<boolean> }) {
  const cost = calculateVeCost(item);
  const [before, setBefore] = useState(cost.before?.toString() || '');
  const [after, setAfter] = useState(cost.after?.toString() || '');
  const [basis, setBasis] = useState(item.calculationBasis || '');
  const [basisType, setBasisType] = useState<'llm-assumption' | 'source-data'>(cost.assumed ? 'llm-assumption' : 'source-data');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const estimate = item.costEstimate;
  const clean = (text?: string) => (text || '').replace(/^(?:(?:LLM\s*가정(?:\s*산출치|\/자료\s*참고)?|LLM\s*추정)\s*[:：]?\s*)+/i, '').trim();
  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
    <section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="원가절감 세부 산출내역" className="ve-cost-dialog max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onKeyDown={e => {
      if (e.key === 'Escape' && !saving) { e.stopPropagation(); onClose(); }
      if (e.key === 'Tab') {
        const controls = Array.from<HTMLElement>(dialogRef.current?.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea,select,summary') || []).filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <header className="ve-dialog-heading flex justify-between gap-4 border-b pb-4"><div><h3 className="text-lg font-bold text-blue-950">원가절감 세부 산출내역</h3><p className="mt-1 text-sm leading-6">{item.description}</p></div><button disabled={saving} onClick={onClose} aria-label="산출내역 닫기" className="h-9 shrink-0 rounded border px-3 text-sm">닫기</button></header>
      {cost.assumed && <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">LLM 가정 산출치 — 기존 검토자료에 가정 수량·단가를 적용한 예상액입니다. 실제 견적과 적용 가능 여부를 확인하세요.</p>}
      <div className="my-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded bg-slate-50 p-3">변경 전<strong className="block">{won(cost.before)}</strong></div>
        <div className="rounded bg-blue-50 p-3">변경 후·추가비용 포함<strong className="block">{won(cost.after)}</strong></div>
        <div className="rounded bg-emerald-50 p-3">순절감금액<strong className="block">{won(cost.savings)}{cost.savings !== undefined && cost.savings < 0 ? ' (비용 증가)' : ''}</strong></div>
      </div>
      <div data-testid="ve-cost-detail" className="text-sm leading-6">
        <section className="ve-detail-section"><h4>비교 범위·산정 조건</h4><dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2"><dt className="text-slate-500">산출 구분</dt><dd>{cost.assumed ? 'LLM 가정 산출치' : '입력·자료 기반 산출'}</dd><dt className="text-slate-500">대상 범위</dt><dd>{estimate?.scope || clean(item.calculationBasis) || '자료 확인 필요'}</dd>{estimate && <><dt className="text-slate-500">단가 기준</dt><dd>{estimate.priceDate || '출처 문서 참조'}</dd><dt className="text-slate-500">부가세</dt><dd>{estimate.vatBasis || '확인 필요'}</dd></>}</dl></section>
        <section className="ve-detail-section"><h4>금액 산출</h4>{estimate?.lines?.length > 0 && <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr>{['항목', '수량 전 → 후', '단가 전 → 후', '절감액 산식'].map(h => <th key={h} className="border-b p-2">{h}</th>)}</tr></thead><tbody>{estimate.lines.map((l, i) => <tr key={i} className="border-b"><td className="p-2">{l.label}</td><td className="p-2">{l.beforeQuantity ?? '미제공'} → {l.afterQuantity ?? '미제공'} {l.unit}</td><td className="p-2">{won(l.beforeUnitPrice)} → {won(l.afterUnitPrice)}</td><td className="p-2">{cost.formulas.find(f => f.startsWith(l.label + ':')) || '수량·단가 보완 필요'}</td></tr>)}</tbody></table></div>}{estimate && <p className="mt-3">추가비용: <b>{won(estimate.additionalCost)}</b><br /><span className="text-slate-600">{clean(estimate.additionalCostBasis) || '근거 확인 필요'}</span></p>}<div className="mt-3 rounded bg-blue-50 p-3"><b>순절감액 = 변경 전 금액 − 변경 후 금액(추가비용 포함)</b><p>{cost.formula}</p></div></section>
        <section className="ve-detail-section"><h4>근거·출처</h4>{estimate && item.calculationBasis && <p className="mb-3 whitespace-pre-wrap">{clean(item.calculationBasis)}</p>}{estimate?.lines?.length ? <ul className="space-y-3">{estimate.lines.map((line, i) => <li key={i}><b>{line.label}</b><p>수량: {clean(line.quantitySource) || '미제공'}</p><p>단가: {clean(line.unitPriceSource) || '미제공'}</p></li>)}</ul> : <p className="whitespace-pre-wrap">{clean(item.calculationBasis) || '산출 근거 미제공'}</p>}{item.evidence && <details className="mt-3 border-t pt-2"><summary className="cursor-pointer font-bold">원문 검토 근거</summary><p className="mt-2 whitespace-pre-wrap">{item.evidence}</p></details>}</section>
        {!!estimate?.assumptions?.length && <section className="ve-detail-section"><h4>가정 및 적용 조건</h4><ul className="list-disc space-y-2 pl-5">{[...new Set(estimate.assumptions)].map((a, i) => <li key={i}>{a}</li>)}</ul></section>}
        {!!(cost.missing.length || estimate?.missingInputs?.length) && <section className="ve-detail-section bg-amber-50"><h4>적용 전 확인사항</h4><ul className="list-disc space-y-1 pl-5">{[...new Set([...cost.missing, ...(estimate?.missingInputs || [])])].map((a, i) => <li key={i}>{a}</li>)}</ul></section>}
      </div>
      {onSave && <details className="mt-5 border-t pt-3"><summary className="cursor-pointer font-bold">산출자료 보완·저장 (총액 비교)</summary>
        <p className="mt-2 text-xs text-slate-600">동일 공사 범위와 부가세 기준의 총액을 입력하세요. 변경 후 금액에는 설계변경·철거·시험 등 추가비용을 포함하세요. 저장하면 이 항목의 금액 산출 방식을 총액 비교로 변경합니다.</p>
        <form className="mt-3 space-y-3" onSubmit={async e => { e.preventDefault(); setSaving(true); setError(''); try {
          const updated = { ...item, costBasisType: basisType, costEstimate: undefined, beforeCostKw: Number(before), afterCostKw: Number(after), calculationBasis: basis.trim() };
          if (calculateVeCost(updated).state !== 'calculated') throw new Error('두 금액과 산출 근거를 확인하세요.');
          if (!await onSave(updated)) throw new Error('산출자료를 저장하지 못했습니다. 다시 시도하세요.');
          onClose();
        } catch (err: any) { setError(err.message); } finally { setSaving(false); } }}>
          <div className="grid grid-cols-2 gap-3"><label>변경 전 금액(원)<input required min="0" step="1" type="number" value={before} onChange={e => setBefore(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label>변경 후 총액(원)<input required min="0" step="1" type="number" value={after} onChange={e => setAfter(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label></div>
          <label className="block">산출 근거·출처<textarea required value={basis} onChange={e => setBasis(e.target.value)} placeholder="수량×단가 산출식, 견적/산출서·페이지·기준일, 비교 범위, 부가세 및 추가비용 반영 근거" className="mt-1 block w-full rounded border p-2" rows={4} /></label>
          <label className="block">산출 구분<select value={basisType} onChange={e => setBasisType(e.target.value as typeof basisType)} className="ml-2 rounded border p-2"><option value="llm-assumption">LLM 가정 산출치</option><option value="source-data">실제 자료·사용자 입력 근거로 산출</option></select></label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button disabled={saving} type="submit" className="rounded bg-blue-900 px-4 py-2 text-white">{saving ? '저장 중…' : '산출자료 저장'}</button>
        </form>
      </details>}
    </section>
  </div>, document.body);
}
