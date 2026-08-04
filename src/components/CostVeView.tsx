import React from 'react';
import { VeItem, PageTab } from '../types';
import { DollarSign, TrendingUp, Plus, UploadCloud } from 'lucide-react';

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
  const filtered = veItems.filter(
    (item) =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSavingKRW = veItems.reduce((acc, curr) => acc + curr.impactKw, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#000d5f]">공사비 및 VE 분석</h2>
          <p className="text-xs font-body text-[#454651] mt-1">
            업로드된 도면 OCR 수량 산출 및 자재 규격 최적화를 통한 VE 절감안 리스트입니다.
          </p>
        </div>
        {onSelectTab && (
          <button
            onClick={() => onSelectTab('upload')}
            className="px-4 py-2 bg-[#000d5f] text-white rounded-lg text-xs font-mono font-bold hover:opacity-90 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            새 도면 업로드
          </button>
        )}
      </div>

      {/* Summary KPI */}
      <div className="bg-[#000d5f] text-white p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
        <div>
          <span className="font-mono text-xs text-[#dfe0ff] font-bold">추정 공사비 VE 절감 가능 금액</span>
          <p className="font-headline text-3xl font-bold mt-1 text-[#bbc3ff]">
            {(totalSavingKRW / 100000000).toFixed(2)} 억원
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs text-[#dfe0ff]">분석 도면 VE 제안 건수</span>
          <p className="font-headline text-2xl font-bold mt-0.5">{veItems.length} 건</p>
        </div>
      </div>

      <div className="bg-white border border-[#c6c5d2] rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f7f9fb] flex justify-between items-center">
          <h3 className="font-headline font-bold text-base text-[#191c1e]">
            VE 제안 및 수량 검증 내역 ({filtered.length}건)
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-3">
            <UploadCloud className="w-10 h-10 mx-auto text-[#000d5f] opacity-60" />
            <h4 className="font-headline font-bold text-base text-[#191c1e]">
              등록된 VE 제안 항목이 없습니다.
            </h4>
            <p className="font-body text-xs text-[#454651] max-w-md mx-auto">
              도면 업로드 메뉴에서 실제 도면을 업로드하면 OCR 자재 수량 및 비용 최적화 제안이 자동 생성됩니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f4f6] font-mono text-xs text-[#454651]">
                <tr>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">구분</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">VE 제안명</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">상세 정보</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">적용 위치</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2] text-right">예상 절감액 (KRW)</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2] text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2] text-xs font-body">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f2f4f6]">
                    <td className="px-6 py-4 font-mono font-bold text-[#000d5f]">{item.type}</td>
                    <td className="px-6 py-4 font-bold text-[#191c1e]">{item.description}</td>
                    <td className="px-6 py-4 text-[#454651]">{item.subDescription}</td>
                    <td className="px-6 py-4 font-mono text-[#454651]">{item.location}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-emerald-700">
                      ₩ {item.impactKw.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-0.5 bg-[#e6e8ea] text-[#000d5f] font-mono font-bold text-[11px] rounded">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
