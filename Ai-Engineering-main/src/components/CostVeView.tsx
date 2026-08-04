import React, { useState } from 'react';
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
  veItems: VeItem[];
  onSelectTab?: (tab: PageTab) => void;
  searchQuery: string;
}

export const CostVeView: React.FC<CostVeViewProps> = ({
  veItems,
  onSelectTab,
  searchQuery,
}) => {
  const [selectedTrade, setSelectedTrade] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form State for Adding New VE Idea
  const [newTrade, setNewTrade] = useState<TradeCategory>('소방');
  const [newDoc, setNewDoc] = useState<DocCategory>('도면');
  const [newDesc, setNewDesc] = useState<string>('');
  const [newBeforeCost, setNewBeforeCost] = useState<number>(100000000);
  const [newAfterCost, setNewAfterCost] = useState<number>(80000000);
  const [newBasis, setNewBasis] = useState<string>('');
  const [newScheduleDays, setNewScheduleDays] = useState<number>(-3);

  // Local state for VE items if user adds new ones
  const [localVeItems, setLocalVeItems] = useState<VeItem[]>([]);

  const combinedVeItems = [...veItems, ...localVeItems];

  // Default fallback VE Items if dataset is empty to demonstrate full financial table functionality
  const effectiveVeItems: VeItem[] =
    combinedVeItems.length > 0
      ? combinedVeItems
      : [
          {
            id: 've-1',
            type: 'VE 제안',
            docCategory: '도면',
            tradeCategory: '소방',
            description: '스프링클러 주배관 100A 관로 최적화 및 알람밸브 구역 분할',
            subDescription: '주배관 관로 18m 단축 및 용접 공수 절감',
            location: '포항 3고로 메인 관로 Zone 2',
            beforeCostKw: 185000000,
            afterCostKw: 144000000,
            impactKw: 41000000,
            savingsRate: 22.2,
            scheduleDays: -5,
            calculationBasis: '주배관 관로 18m 단축 (용접 joint 12개 감소), 표준품셈 배관공 25인일 절감 적용',
            status: '승인완료',
          },
          {
            id: 've-2',
            type: 'VE 제안',
            docCategory: '내역서',
            tradeCategory: '건축전기',
            description: '수변전실 강전 케이블 트레이 경로 일원화 및 TFR-CV 절연 사양 조정',
            subDescription: '포항 제철소 KEC 통합 접지 및 케이블 트레이 표준화',
            location: '전기실 B1층 Cable Duct',
            beforeCostKw: 320000000,
            afterCostKw: 258000000,
            impactKw: 62000000,
            savingsRate: 19.4,
            scheduleDays: -7,
            calculationBasis: '케이블 트레이 폭 600W->400W 집약 설치, TFR-CV 185sq 포설 길이 120m 단축',
            status: '검토대기',
          },
          {
            id: 've-3',
            type: 'VE 제안',
            docCategory: '시방서',
            tradeCategory: '건축기계',
            description: '급기 덕트(SA) 풍량 계산 보정을 통한 덕트 규격 축소 (500x350 -> 450x300)',
            subDescription: '송풍기 정압 재계산 및 불필요 오버스펙 자재 변경',
            location: 'HVAC 공조기실 Room A',
            beforeCostKw: 145000000,
            afterCostKw: 118000000,
            impactKw: 27000000,
            savingsRate: 18.6,
            scheduleDays: -3,
            calculationBasis: '덕트 철판(GI 0.8T) 사용량 220㎡ 감축 및 방화댐퍼(FD) 수량 4개 적정화',
            status: '적용중',
          },
          {
            id: 've-4',
            type: '수량 오류',
            docCategory: '내역서',
            tradeCategory: '토목',
            description: '흙막이 가설 구조물 H-Pile 300x300 항타 자재 중복 산출 교정',
            subDescription: '도면 표제란 수량과 산출 내역서 간 중복 수량 차액 감액',
            location: '외곽 토공사 굴착구간',
            beforeCostKw: 280000000,
            afterCostKw: 228000000,
            impactKw: 52000000,
            savingsRate: 18.6,
            scheduleDays: -4,
            calculationBasis: '토목 수량 산출서와 도면 CAD 오차 12m 구간 항타 중복 계상 정정',
            status: '승인완료',
          },
          {
            id: 've-5',
            type: 'VE 제안',
            docCategory: '도면',
            tradeCategory: '건축',
            description: '방화구획 내화벽체 ALC 블록 공법을 경량 K-Board 건식 방화벽으로 변경',
            subDescription: '내화 2시간 차염/차열 성능 확보 및 습식 공정 단축',
            location: '지상 2층 방화구역 전체',
            beforeCostKw: 210000000,
            afterCostKw: 165000000,
            impactKw: 45000000,
            savingsRate: 21.4,
            scheduleDays: -9,
            calculationBasis: '습식 양생 기간 제거(-9일), 하중 경감에 따른 슬래브 보강 비용 1,500만원 동시 절감',
            status: '검토대기',
          },
        ];

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

  // Financial Statistics Calculation
  const totalBeforeCost = filtered.reduce((acc, curr) => acc + (curr.beforeCostKw || curr.impactKw * 4), 0);
  const totalAfterCost = filtered.reduce((acc, curr) => acc + (curr.afterCostKw || curr.impactKw * 3), 0);
  const totalSavings = filtered.reduce((acc, curr) => acc + curr.impactKw, 0);
  const avgSavingsRate = totalBeforeCost > 0 ? ((totalSavings / totalBeforeCost) * 100).toFixed(1) : '0.0';
  const totalScheduleDays = filtered.reduce((acc, curr) => acc + (curr.scheduleDays || -3), 0);

  const handleExportCsv = () => {
    if (filtered.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      '공종,도서구분,VE 아이디어명,변경 전 금액(원),변경 후 금액(원),절감 금액(원),절감률(%),공기 영향(일),세부 산출 근거,상태\n' +
      filtered
        .map(
          (i) =>
            `"${i.tradeCategory || '소방'}","${i.docCategory || '도면'}","${i.description.replace(/"/g, '""')}","${
              i.beforeCostKw || i.impactKw * 4
            }","${i.afterCostKw || i.impactKw * 3}","${i.impactKw}","${
              i.savingsRate || ((i.impactKw / (i.beforeCostKw || i.impactKw * 4)) * 100).toFixed(1)
            }","${i.scheduleDays || -3}","${(i.calculationBasis || '').replace(/"/g, '""')}","${i.status}"`
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'POSCO_VE_Financial_Analysis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddVeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const savings = Math.max(newBeforeCost - newAfterCost, 0);
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
      calculationBasis: newBasis || '사용자 산출 근거 적용',
      status: '검토대기',
    };

    setLocalVeItems([newItem, ...localVeItems]);
    setShowAddModal(false);
    setNewDesc('');
    setNewBasis('');
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#000d5f] flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#000d5f]" />
            공사비 절감 및 VE(Value Engineering) 정밀 금액 분석표
          </h2>
          <p className="text-xs font-body text-[#454651] mt-1">
            업로드된 도면/시방서/내역서 OCR 분석 기반, 공종별 원가 절감 아이디어의 금액 산출 근거 및 공기 단축 효과 수치표입니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 border border-[#000d5f] text-[#000d5f] bg-white rounded-xl text-xs font-mono font-bold hover:bg-[#dfe0ff]/40 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            금액 분석표 CSV 내보내기
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Savings */}
        <div className="bg-[#000d5f] text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs text-[#dfe0ff] font-bold">총 VE 예상 절감액</span>
            <span className="p-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <p className="font-headline text-2xl font-black text-[#bbc3ff]">
              {(totalSavings / 100000000).toFixed(2)} 억원
            </p>
            <p className="text-[11px] text-gray-300 mt-0.5 font-mono">
              ₩ {totalSavings.toLocaleString()} 원
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-emerald-300 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>기존 공사비 대비 높은 절감 효율</span>
          </div>
        </div>

        {/* KPI 2: Total Before Cost vs After Cost */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">변경 전/후 예상 공사비</span>
            <Calculator className="w-4 h-4 text-[#000d5f]" />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-[#767682]">기존 변경 전:</span>
              <span className="line-through text-gray-500">₩ {totalBeforeCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-mono font-bold text-[#000d5f]">
              <span>VE 변경 후:</span>
              <span className="text-blue-900">₩ {totalAfterCost.toLocaleString()}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651]">
            총 {filtered.length}개 VE 항목 금액 종합
          </div>
        </div>

        {/* KPI 3: Average Savings Rate */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">평균 원가 절감률</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <p className="font-headline text-3xl font-black text-emerald-700">
              {avgSavingsRate}%
            </p>
            <p className="text-[11px] text-[#454651] mt-0.5">전체 공종 평균 절감 비율</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>최대 절감 항목: 소방 (22.2%)</span>
          </div>
        </div>

        {/* KPI 4: Schedule Impact */}
        <div className="bg-white border border-[#c6c5d2] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start text-[#454651]">
            <span className="font-mono text-xs font-bold">예상 공기 단축 효과</span>
            <Calendar className="w-4 h-4 text-[#000d5f]" />
          </div>
          <div className="mt-3">
            <p className="font-headline text-3xl font-black text-[#000d5f]">
              {totalScheduleDays} 일
            </p>
            <p className="text-[11px] text-[#454651] mt-0.5">시공성 개선에 따른 공기 단축</p>
          </div>
          <div className="mt-3 pt-2 border-t border-[#c6c5d2] text-[10px] text-[#454651]">
            공정 마일스톤 준수 및 노무비 절감
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
              공종별 변경 전/후 단가 수량 비교, 절감액 수치, 세부 산출 근거를 표 형태로 검토합니다.
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
                    변경 후 금액
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
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] min-w-[240px]">
                    세부 산출 근거 (Calculation Basis)
                  </th>
                  <th className="px-5 py-3.5 font-bold border-b border-[#c6c5d2] text-center whitespace-nowrap min-w-[90px]">
                    상태
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2] text-xs font-body">
                {filtered.map((item, idx) => {
                  const beforeCost = item.beforeCostKw || item.impactKw * 4;
                  const afterCost = item.afterCostKw || item.impactKw * 3;
                  const savings = item.impactKw;
                  const rate = item.savingsRate || (beforeCost > 0 ? ((savings / beforeCost) * 100).toFixed(1) : '0.0');
                  const sched = item.scheduleDays !== undefined ? item.scheduleDays : -3;

                  return (
                    <tr
                      key={item.id || `ve-${idx}`}
                      className={`hover:bg-[#dfe0ff]/20 transition-colors ${
                        idx % 2 === 1 ? 'bg-[#f7f9fb]' : 'bg-white'
                      }`}
                    >
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
                        ₩ {beforeCost.toLocaleString()}
                      </td>

                      {/* After Cost */}
                      <td className="px-5 py-4 text-right font-mono font-bold text-[#000d5f] whitespace-nowrap">
                        ₩ {afterCost.toLocaleString()}
                      </td>

                      {/* Savings Amount */}
                      <td className="px-5 py-4 text-right font-mono font-black text-emerald-700 bg-emerald-50/50 whitespace-nowrap">
                        ₩ {savings.toLocaleString()}
                      </td>

                      {/* Savings Rate % */}
                      <td className="px-5 py-4 text-center font-mono font-bold text-emerald-800 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-emerald-100 rounded-full text-[11px]">
                          {rate}%
                        </span>
                      </td>

                      {/* Schedule Impact */}
                      <td className="px-5 py-4 text-center font-mono text-xs whitespace-nowrap font-bold text-[#000d5f]">
                        {sched < 0 ? `${sched}일 단축` : '영향 없음'}
                      </td>

                      {/* Calculation Basis */}
                      <td className="px-5 py-4 text-[#454651] text-[11px] leading-relaxed">
                        <div className="bg-[#f2f4f6] p-2 rounded border border-[#c6c5d2] font-sans">
                          {item.calculationBasis || '표준 품셈 및 시방서 자재 규격 재계산 반영'}
                        </div>
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
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Custom VE Idea Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
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
                    ₩ {Math.max(newBeforeCost - newAfterCost, 0).toLocaleString()}
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
                  rows={2}
                  value={newBasis}
                  onChange={(e) => setNewBasis(e.target.value)}
                  placeholder="예: 자재 표준 단가 재계산 및 노무 공수 20% 절감 적용"
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
        </div>
      )}
    </div>
  );
};
