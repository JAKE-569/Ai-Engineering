import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calculateVeCost, normalizeVeCost, veCsv, won } from '../lib/veCost';
import { VeCostDetails } from './VeCostDetails';
import { isVeAdopted, veAdoptionFingerprint, veAdoptionSummary, largeVeAmount } from '../lib/veAdoption';
import { VeItem, PageTab, TradeCategory, DocCategory } from '../types';
import {
  DollarSign,
  TrendingUp,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  Search,
  Sparkles,
  Calculator,
  Calendar,
  ArrowDownRight,
  PieChart,
} from 'lucide-react';

interface CostVeViewProps {
  manualVeItems: VeItem[];
  onChangeManualVeItems: (items: VeItem[]) => boolean;
  onAdoptVeItem?: (item: VeItem, accepted: boolean) => Promise<boolean>;
  onEstimateVeItem?: (item: VeItem) => Promise<boolean>;
  onSaveVeItem?: (item: VeItem) => Promise<boolean>;
  veItems: VeItem[];
  onSelectTab?: (tab: PageTab) => void;
  searchQuery: string;
}

export const CostVeView: React.FC<CostVeViewProps> = ({
  veItems,
  manualVeItems: localVeItems,
  onChangeManualVeItems,
  onSaveVeItem,
  onAdoptVeItem,
  onEstimateVeItem,
  onSelectTab,
  searchQuery,
}) => {
  const [selectedTrade, setSelectedTrade] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedVeItem, setSelectedVeItem] = useState<VeItem | null>(null);
  const [estimating, setEstimating] = useState('');
  const [adoptionSaving, setAdoptionSaving] = useState('');
  const adoptionLock = useRef(false);
  const [adoptionError, setAdoptionError] = useState('');
  const adoptItem = async (item: VeItem, accepted: boolean) => {
    if (adoptionLock.current || estimateLock.current) return;
    adoptionLock.current = true; setAdoptionSaving(item.id); setAdoptionError('');
    try {
      if (item.documentId) { if (!onAdoptVeItem || !await onAdoptVeItem(item, accepted)) throw new Error('채택 상태를 저장하지 못했습니다. 다시 시도하세요.'); }
      else if (!onChangeManualVeItems(localVeItems.map(v => v.id === item.id ? { ...v, adoption: { accepted, fingerprint: veAdoptionFingerprint(v), updatedAt: new Date().toISOString() } } : v))) throw new Error('채택 상태를 저장하지 못했습니다. 다시 시도하세요.');
    } catch (error: any) { setAdoptionError(error.message); }
    finally { adoptionLock.current = false; setAdoptionSaving(''); }
  };
  const estimateLock = useRef(false);
  const [estimateMessage, setEstimateMessage] = useState('');
  const estimateItems = async (items: VeItem[]) => {
    if (estimateLock.current || adoptionLock.current || !onEstimateVeItem) return;
    estimateLock.current = true; setEstimateMessage('');
    let success = 0;
    try { for (const [index, item] of items.entries()) { setEstimating(`${index + 1}/${items.length}: ${item.description}`); if (await onEstimateVeItem(item)) success++; } }
    finally { setEstimating(''); estimateLock.current = false; setEstimateMessage(`LLM 가정 산출 저장 ${success}/${items.length}건${success < items.length ? ' · 실패 항목은 오류 확인 후 재시도하세요.' : ''}`); }
  };

  // Form State for Adding New VE Idea
  const [newTrade, setNewTrade] = useState<TradeCategory>('소방');
  const [newDoc, setNewDoc] = useState<DocCategory>('도면');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newBeforeCost, setNewBeforeCost] = useState<number>(0);
  const [newAfterCost, setNewAfterCost] = useState<number>(0);
  const [newBasis, setNewBasis] = useState<string>('');
  const [newScheduleDays, setNewScheduleDays] = useState<number>(0);

  const combinedVeItems = [...veItems, ...localVeItems];

  const effectiveVeItems = combinedVeItems.map(normalizeVeCost);

  const query = localSearch || searchQuery;

  const filtered = effectiveVeItems.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(query.toLowerCase()) ||
      item.subDescription.toLowerCase().includes(query.toLowerCase()) ||
      item.location.toLowerCase().includes(query.toLowerCase()) ||
      (item.calculationBasis && item.calculationBasis.toLowerCase().includes(query.toLowerCase()));

    if (selectedTrade === 'ALL') return matchesSearch;
    return matchesSearch && item.tradeCategory === selectedTrade;
  });

  const adoptedSummary = veAdoptionSummary(effectiveVeItems);
  const { before: totalBeforeCost, after: totalAfterCost, savings: totalSavings, assumedSavings, sourcedSavings } = adoptedSummary;
  const savingsDisplay = largeVeAmount(totalSavings);
  const avgSavingsRate = adoptedSummary.rate?.toFixed(1) ?? '—';
  const missingCostCount = effectiveVeItems.filter(i => calculateVeCost(i).state === 'needs-input').length;
  const handleExportCsv = () => {
    if (!adoptedSummary.adopted.length) return;
    const url = URL.createObjectURL(new Blob([veCsv(adoptedSummary.adopted)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'POSCO_VE_Financial_Analysis.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleAddVeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const savings = newBeforeCost - newAfterCost;
    const rate = newBeforeCost > 0 ? parseFloat(((savings / newBeforeCost) * 100).toFixed(1)) : 0;

    const newItem: VeItem = {
      id: `ve-custom-${Date.now()}`,
      type: 'VE 제안',
      docCategory: newDoc,
      tradeCategory: newTrade,
      description: newDesc,
      subDescription: `[${newTrade}/${newDoc}] 사용자 직접 입력 원가절감 제안`,
      location: 'POSCO Plant 공구 전체',
      beforeCostKw: newBeforeCost,
      afterCostKw: newAfterCost,
      impactKw: savings,
      savingsRate: rate,
      scheduleDays: newScheduleDays,
      calculationBasis: newBasis.trim(),
      status: '검토대기',
    };

    if (!onChangeManualVeItems([newItem, ...localVeItems])) return;
    setShowAddModal(false);
    setNewDesc('');
    setNewBasis('');
  };

  return (
    <div className="cost-ve-view space-y-8 pb-12">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div className="cost-page-header min-w-0">
          <h2 className="font-headline text-2xl font-bold text-[#000d5f] flex items-center gap-2">
            공사비 절감 및 VE(Value Engineering) 정밀 금액 분석표
          </h2>
          <p className="text-xs font-body text-[#454651] mt-1">
            업로드된 도면/시방서/내역서 OCR 분석 기반, 공종별 원가 절감 아이디어의 금액 산출 근거 및 공기 단축 효과 수치표입니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" disabled={!!estimating || !!adoptionSaving || !onEstimateVeItem || !filtered.some(i => i.documentId && calculateVeCost(i).state === 'needs-input')} onClick={() => estimateItems(filtered.filter(i => i.documentId && calculateVeCost(i).state === 'needs-input'))} className="rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">미산정 항목 LLM 가정 산출</button>
          <button
            onClick={handleExportCsv}
            disabled={!adoptedSummary.adopted.length || !!adoptionSaving}
            className="px-4 py-2 border border-[#000d5f] text-[#000d5f] bg-white rounded-xl text-xs font-mono font-bold hover:bg-[#dfe0ff]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            채택 항목 CSV 내보내기
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#000d5f] text-white rounded-xl text-xs font-mono font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            VE 아이디어 직접 추가
          </button>
        </div>
      </div>

      {/* Financial Overview KPIs */}
      {adoptionError && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{adoptionError}</p>}
      {(estimating || estimateMessage) && <p role="status" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">{estimating ? `LLM 가정 산출 중 · ${estimating}` : estimateMessage}</p>}
      <p className="text-sm text-slate-700">채택 항목 · 자료 기반 순절감액: {won(sourcedSavings)} · <strong className="text-amber-800">LLM 가정 산출치: {won(assumedSavings)}</strong>. 가정 수량·단가와 비교 범위를 확인하세요. 합계와 CSV는 검색 조건과 관계없이 채택한 항목만 반영합니다.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Savings */}
        <div className="bg-[#000d5f] text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#dfe0ff] font-bold">채택 VE 예상 절감액</span>
            <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p data-testid="ve-adopted-savings" className="ve-savings-number text-[#bbc3ff]">{savingsDisplay.value}<span className="ve-savings-unit">{savingsDisplay.unit}</span></p>
            <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
              {won(totalSavings)} · 채택 {adoptedSummary.adopted.length}건
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-emerald-300 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>체크한 항목만 반영 · 중복·대체안은 선택 시 확인</span>
          </div>
        </div>

        {/* KPI 2: Total Before Cost vs After Cost */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">채택 항목 변경 전·후 공사비</span>
            <Calculator className="w-4 h-4 text-[#000d5f]" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#767682]">기존 변경 전:</span>
              <span data-testid="ve-adopted-before" className="line-through text-gray-500">{won(totalBeforeCost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono font-bold text-[#000d5f]">
              <span>VE 변경 후:</span>
              <span data-testid="ve-adopted-after" className="text-blue-900">{won(totalAfterCost)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651]">
            채택 {adoptedSummary.adopted.length} / 전체 {effectiveVeItems.length}건
          </div>
        </div>

        {/* KPI 3: Average Savings Rate */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">합산 금액 기준 절감률</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="font-headline text-3xl font-black text-emerald-700">
              {avgSavingsRate}%
            </p>
            <p className="text-[11px] text-[#454651] mt-0.5">채택 항목의 변경 전 금액 대비 순절감 비율</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>수량·단가 또는 근거 있는 총액으로 계산</span>
          </div>
        </div>

        {/* KPI 4: Schedule Impact */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">산정자료 필요 항목</span>
            <Calendar className="w-4 h-4 text-[#000d5f]" />
          </div>
          <div className="mt-3">
            <p className="font-headline text-3xl font-black text-[#000d5f]">
              {missingCostCount} 건
            </p>
            <p className="text-[11px] text-[#454651] mt-0.5">수량·단가·추가비용 근거 보완</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651]">
            미산정 항목은 절감액 합계에서 제외
          </div>
        </div>
      </div>

      {/* Main Financial Breakdown Table Card */}
      <div className="bg-white border border-[#c6c5d2] rounded-2xl overflow-hidden shadow-xs">
        {/* Table Filter Header */}
        <div className="p-5 border-b border-[#c6c5d2] bg-[#f7f9fb] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="font-headline text-base font-bold text-[#191c1e] flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#000d5f]" />
              원가절감 아이디어 상세 금액 분석표 (Financial Cost Breakdown)
            </h3>
            <p className="text-xs text-[#454651] font-body mt-0.5">
              후보별 예상금액을 비교하여 채택하세요. 상세 수량·단가·가정·출처는 산출 근거 버튼에서 확인합니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Trade Filter Tabs */}
            <div className="flex items-center bg-[#e6e8ea] p-1 rounded-xl font-mono text-xs overflow-x-auto max-w-full">
              {['ALL', '토목', '건축', '건축기계', '건축전기', '소방'].map((trade) => (
                <button
                  key={trade}
                  onClick={() => setSelectedTrade(trade)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                    selectedTrade === trade
                      ? 'bg-[#000d5f] text-white shadow-xs'
                      : 'text-[#454651] hover:text-[#191c1e]'
                  }`}
                >
                  {trade === 'ALL' ? '전체 공종' : trade}
                </button>
              ))}
            </div>

            {/* Local Search Input */}
            <div className="relative flex-1 lg:flex-initial">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="VE 아이디어/근거 검색..."
                className="pl-8 pr-3 py-1.5 border border-[#c6c5d2] rounded-xl bg-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#000d5f] w-full lg:w-48"
              />
              <Search className="w-3.5 h-3.5 text-[#767682] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-3">
            <UploadCloud className="w-10 h-10 mx-auto text-[#000d5f] opacity-60" />
            <h4 className="font-headline font-bold text-base text-[#191c1e]">
              검색 조건에 맞는 VE 아이디어가 없습니다.
            </h4>
            <p className="font-body text-xs text-[#454651] max-w-md mx-auto">
              상단 공종 필터를 '전체 공종'으로 변경하거나 도면을 업로드하여 자동 분석을 시행하세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#e6e8ea] font-mono text-xs text-[#454651]">
                <tr>
                  <th className="px-3 py-3 text-center whitespace-nowrap">채택</th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] whitespace-nowrap min-w-[120px]">
                    공종 / 도서
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] min-w-[200px]">
                    VE 아이디어 제안명
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-right whitespace-nowrap min-w-[120px]">
                    변경 전 금액
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-right whitespace-nowrap min-w-[120px]">
                    변경 후 금액(추가비용 포함)
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-right whitespace-nowrap min-w-[120px]">
                    절감 금액 (차액)
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-center whitespace-nowrap min-w-[80px]">
                    절감률
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-center whitespace-nowrap min-w-[90px]">
                    공기 영향
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] whitespace-nowrap">
                    산출 근거
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-center whitespace-nowrap min-w-[90px]">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2] text-xs font-body">
                {filtered.map((item, idx) => {
                  const cost = calculateVeCost(item);
                  const beforeCost = cost.before, afterCost = cost.after, savings = cost.savings;
                  const rate = cost.rate?.toFixed(1) ?? '—';
                  const sched = item.scheduleDays;
                  const adopted = isVeAdopted(item);

                  return (
                    <tr
                      key={item.id || `ve-${idx}`}
                      data-testid="ve-cost-row"
                      className={`hover:bg-[#dfe0ff]/20 transition-colors ${
                        idx % 2 === 1 ? 'bg-[#f7f9fb]' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-4 text-center"><label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" aria-label={item.description + ' 채택'} checked={adopted} disabled={!!adoptionSaving || !!estimating || cost.state !== 'calculated' || (!!item.documentId && !onAdoptVeItem)} onChange={e => adoptItem(item, e.target.checked)} className="h-5 w-5 accent-emerald-700" />{adoptionSaving === item.id ? '저장 중' : adopted ? '채택' : '미채택'}</label>{item.adoption?.accepted && !adopted && <p className="mt-1 text-[10px] text-amber-700">산출 변경 · 재선택</p>}</td>
                      {/* Trade & Doc Category Badges with whitespace-nowrap to fix text break issue */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold whitespace-nowrap inline-block text-center border ${
                              item.tradeCategory === '토목'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : item.tradeCategory === '건축'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : item.tradeCategory === '건축기계'
                                ? 'bg-teal-100 text-teal-900 border-teal-300'
                                : item.tradeCategory === '건축전기'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : 'bg-red-100 text-red-900 border-red-300'
                            }`}
                          >
                            {item.tradeCategory || '소방'}
                          </span>
                          <span className="px-2.5 py-0.5 bg-[#000d5f] text-white rounded text-[10px] font-mono font-bold whitespace-nowrap inline-block text-center">
                            {item.docCategory || '도면'}
                          </span>
                        </div>
                      </td>

                      {/* Idea Title & Sub-location */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-[#191c1e] text-sm block leading-snug">
                          {item.description}
                        </span>
                        <span className="text-[#767682] text-[11px] block mt-0.5 font-mono">
                          📍 {item.location} ({item.subDescription})
                        </span>
                      </td>

                      {/* Before Cost */}
                      <td className="px-5 py-4 text-right font-mono text-[#767682] whitespace-nowrap">
                        {won(beforeCost)}
                      </td>

                      {/* After Cost */}
                      <td className="px-5 py-4 text-right font-mono font-bold text-[#000d5f] whitespace-nowrap">
                        {won(afterCost)}
                      </td>

                      {/* Savings Amount */}
                      <td className="px-5 py-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 whitespace-nowrap">
                        {won(savings)}{savings !== undefined && savings < 0 ? " (비용 증가)" : ""}
                        {cost.assumed && <span className="mt-1 block text-xs font-bold text-amber-800">LLM 가정 산출치</span>}
                      </td>

                      {/* Savings Rate % */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-100 rounded-full text-[11px]">
                          {rate}%
                        </span>
                      </td>

                      {/* Schedule Impact */}
                      <td className="px-5 py-4 text-center font-mono text-xs whitespace-nowrap font-bold text-[#000d5f]">
                        {sched === undefined ? '자료 없음' : sched < 0 ? `${Math.abs(sched)}일 단축` : sched > 0 ? `${sched}일 증가` : '영향 없음'}
                      </td>

                      {/* Calculation Basis */}
                      <td className="px-5 py-4 text-[#454651] text-[11px] leading-relaxed">
                        <button type="button" disabled={!!adoptionSaving || !!estimating} onClick={() => setSelectedVeItem(item)} className="whitespace-nowrap rounded-lg border border-blue-800 bg-white px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 disabled:opacity-40">산출 근거 보기</button>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 font-mono font-bold text-[11px] rounded-full inline-block text-center ${
                            item.status === '승인완료'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === '적용중'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {cost.state === 'calculated' ? cost.assumed ? 'LLM 가정 산출치' : '자료 기반 산정 완료' : '산정자료 필요'}
                        </span>
{item.documentId && onEstimateVeItem && (cost.state === 'needs-input' || cost.assumed) && <button type="button" disabled={!!estimating || !!adoptionSaving} onClick={() => estimateItems([item])} className="mt-2 block rounded border border-amber-700 px-2 py-1 text-xs text-amber-900 disabled:opacity-40">{cost.assumed ? 'LLM 가정 재산출' : 'LLM 가정 산출'}</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedVeItem && <VeCostDetails item={selectedVeItem} onClose={() => setSelectedVeItem(null)} onSave={selectedVeItem.documentId ? onSaveVeItem : async updated => onChangeManualVeItems(localVeItems.map(i => i.id === updated.id ? updated : i))} />}

      {/* Add Custom VE Idea Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-label="신규 VE 아이디어" className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
            <div className="flex justify-between items-center border-b pb-3 border-[#c6c5d2]">
              <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#000d5f]" />
                신규 VE 원가절감 아이디어 항목 작성
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-700 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">직접 입력한 항목과 채택 여부는 현재 브라우저에 저장됩니다.</p>
            <form onSubmit={handleAddVeSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">공종 구분</label>
                  <select
                    value={newTrade}
                    onChange={(e) => setNewTrade(e.target.value as TradeCategory)}
                    className="w-full p-2 border border-[#c6c5d2] rounded-lg font-mono"
                  >
                    <option value="토목">토목 (Civil)</option>
                    <option value="건축">건축 (Architectural)</option>
                    <option value="건축기계">건축기계 (HVAC)</option>
                    <option value="건축전기">건축전기 (Electrical)</option>
                    <option value="소방">소방 (Fire Protection)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">도서 구분</label>
                  <select
                    value={newDoc}
                    onChange={(e) => setNewDoc(e.target.value as DocCategory)}
                    className="w-full p-2 border border-[#c6c5d2] rounded-lg font-mono"
                  >
                    <option value="도면">도면 (Drawing)</option>
                    <option value="시방서">시방서 (Spec)</option>
                    <option value="내역서">내역서 (BoQ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#191c1e] block mb-1">VE 아이디어 제안명</label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="예: 배관 관로 최적화 및 연결 조인트 감소"
                  className="w-full p-2.5 border border-[#c6c5d2] rounded-lg font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">기존 변경 전 금액 (원)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newBeforeCost}
                    onChange={(e) => setNewBeforeCost(Number(e.target.value))}
                    className="w-full p-2 border border-[#c6c5d2] rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">VE 변경 후 금액 (원)</label>
                  <input
                    type="number"
                    required
                    value={newAfterCost}
                    onChange={(e) => setNewAfterCost(Number(e.target.value))}
                    className="w-full p-2 border border-[#c6c5d2] rounded-lg font-mono text-emerald-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">예상 절감 금액 (차액)</label>
                  <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg font-mono font-bold text-emerald-800">
                    ₩ {(newBeforeCost - newAfterCost).toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="font-bold text-[#191c1e] block mb-1">공기 단축 (일)</label>
                  <input
                    type="number"
                    value={newScheduleDays}
                    onChange={(e) => setNewScheduleDays(Number(e.target.value))}
                    className="w-full p-2 border border-[#c6c5d2] rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#191c1e] block mb-1">세부 산출 근거 (Calculation Basis)</label>
                <textarea
                  rows={3}
                  required
                  value={newBasis}
                  onChange={(e) => setNewBasis(e.target.value)}
                  placeholder="동일 범위·부가세 기준, 수량×단가 식, 문서/견적·페이지·기준일 및 추가비용 반영 근거"
                  className="w-full p-2.5 border border-[#c6c5d2] rounded-lg font-sans text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#c6c5d2]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#c6c5d2] rounded-lg font-mono text-xs"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#000d5f] text-white rounded-lg font-mono font-bold text-xs hover:opacity-90"
                >
                  금액 분석표에 추가
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}
    </div>
  );
};
