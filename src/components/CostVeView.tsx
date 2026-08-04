import React, { useState } from 'react';
import { VeItem } from '../types';
import {
  TrendingDown,
  AlertTriangle,
  Compass,
  Filter,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface CostVeViewProps {
  veItems: VeItem[];
  searchQuery: string;
}

export const CostVeView: React.FC<CostVeViewProps> = ({ veItems, searchQuery }) => {
  const [selectedDetail, setSelectedDetail] = useState<VeItem | null>(null);

  const filteredVeItems = veItems.filter(
    (item) =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      '유형,항목명,위치,예상임팩트(KRW),상태\n' +
      veItems
        .map((v) => `"${v.type}","${v.description}","${v.location}","${v.impactKw}","${v.status}"`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'POSCO_Cost_VE_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-[#000d5f]">공사비 및 VE 상세</h2>
        <p className="text-xs font-body text-[#454651] mt-1">
          AI 기반 도면 분석을 통한 공사비 절감 제안 및 수량 불일치 검토 리포트입니다.
        </p>
      </div>

      {/* Top High-level Metrics (3 columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg shadow-xs hover:border-[#000d5f] transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[#454651] font-mono text-xs">절감 가능 예상액 (VE)</span>
            <TrendingDown className="w-5 h-5 text-[#000d5f]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#000d5f]">₩ 1.42B</span>
          </div>
          <div className="mt-2 text-[#4284e0] flex items-center gap-1 font-mono text-xs font-bold">
            <span>↑ 전월 대비 12.4% 증가</span>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg shadow-xs hover:border-[#ba1a1a] transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[#454651] font-mono text-xs">수량 오차 경고</span>
            <AlertTriangle className="w-5 h-5 text-[#ba1a1a]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#191c1e]">24</span>
            <span className="text-[#454651] font-body text-sm">건</span>
          </div>
          <div className="mt-2 text-[#ba1a1a] flex items-center gap-1 font-mono text-xs font-bold">
            <span>심각도 '높음' 항목 8건 포함</span>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg shadow-xs hover:border-[#000d5f] transition-all">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[#454651] font-mono text-xs">검토 완료 도면 수</span>
            <Compass className="w-5 h-5 text-[#586377]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline text-3xl font-bold text-[#191c1e]">158</span>
            <span className="text-[#454651] font-body text-sm">/ 180</span>
          </div>
          <div className="mt-3 w-full bg-[#eceef0] h-2 rounded-full overflow-hidden">
            <div className="bg-[#000d5f] h-full" style={{ width: '87%' }}></div>
          </div>
        </div>
      </div>

      {/* Visualization Section (2 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Variance Chart */}
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-bold text-base text-[#191c1e]">
              공종별 공사비 오차 분석 (Variance Report)
            </h3>
            <select className="bg-[#f7f9fb] border border-[#c6c5d2] text-[#454651] font-mono text-xs rounded px-2.5 py-1 outline-none">
              <option>최근 3개월</option>
              <option>전체 기간</option>
            </select>
          </div>

          <div className="h-64 flex items-end justify-between px-4">
            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#000d5f] h-40 rounded-t-xs"></div>
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#191c1e] text-white font-mono text-[10px] px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  12%
                </div>
              </div>
              <span className="font-mono text-[10px] text-[#454651] rotate-45 mt-3">토공사</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#000d5f] h-32 rounded-t-xs"></div>
              </div>
              <span className="font-mono text-[10px] text-[#454651] rotate-45 mt-3">철콘공사</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#000d5f] h-16 rounded-t-xs"></div>
              </div>
              <span className="font-mono text-[10px] text-[#454651] rotate-45 mt-3">강구조</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#ba1a1a] h-44 rounded-t-xs"></div>
              </div>
              <span className="font-mono text-[10px] text-[#ba1a1a] font-bold rotate-45 mt-3">마감공사</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#000d5f] h-24 rounded-t-xs"></div>
              </div>
              <span className="font-mono text-[10px] text-[#454651] rotate-45 mt-3">설비</span>
            </div>

            <div className="flex flex-col items-center gap-2 w-12">
              <div className="w-full bg-[#000d5f]/10 h-48 rounded-t-xs relative group">
                <div className="absolute inset-x-0 bottom-0 bg-[#000d5f] h-12 rounded-t-xs"></div>
              </div>
              <span className="font-mono text-[10px] text-[#454651] rotate-45 mt-3">기타</span>
            </div>
          </div>
        </div>

        {/* Material Usage Insight Panel */}
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg relative overflow-hidden shadow-xs flex flex-col justify-between">
          <div
            className="bg-cover bg-center w-full h-full opacity-5 absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBX9uIdoTt4eYlAvI0-m75fTpKGgd6MHcvhIJ-HpYgFutRr_9mJLouajp0nGNNXNPEtG3FOJ80XNumjZUCAihucwP_P8IkR069bWJtbEAzKpbhQ3d3BOmXptNxd_AFj1s4d3y9aexOw5aFusmTuQmNAQ3tK5zmzQLVvCgcZMKQGoTo33qdNb_ymzfPy3Q2__7vBaxWduRmR74vohIb_Uq02jOT0S5o5YcmiDF9ZGrPFntUxeHQERc2hCw')",
            }}
          ></div>

          <div className="relative z-10 space-y-5">
            <h3 className="font-headline font-bold text-base text-[#191c1e]">주요 자재 투입 최적화 분석</h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 font-mono text-xs">
                  <span className="text-[#454651]">철강 (Steel)</span>
                  <span className="text-[#000d5f] font-bold">최적화 가능 - 150톤</span>
                </div>
                <div className="w-full bg-[#eceef0] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#000d5f] h-full" style={{ width: '65%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 font-mono text-xs">
                  <span className="text-[#454651]">콘크리트 (Concrete)</span>
                  <span className="text-[#ba1a1a] font-bold">초과 할당 위험 - 1,200m³</span>
                </div>
                <div className="w-full bg-[#eceef0] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ba1a1a] h-full" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 font-mono text-xs">
                  <span className="text-[#454651]">철근 (Rebar)</span>
                  <span className="text-[#191c1e]">정상 - 설계 준수</span>
                </div>
                <div className="w-full bg-[#eceef0] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#454651] h-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#c6c5d2]/40 relative z-10">
            <p className="font-body text-xs text-[#454651] leading-relaxed">
              도면 대비 할증률이 비정상적으로 높은 섹션을 탐지했습니다. 하단 상세 리스트를 확인하십시오.
            </p>
          </div>
        </div>
      </div>

      {/* Critical Findings Table Section */}
      <div className="bg-white border border-[#c6c5d2] rounded-lg overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[#c6c5d2] flex justify-between items-center bg-[#f7f9fb]">
          <h3 className="font-headline font-bold text-base text-[#191c1e]">
            Critical Findings: VE Opportunities & Quantity Errors
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="bg-[#f2f4f6] text-[#191c1e] px-4 py-2 rounded font-mono text-xs flex items-center gap-2 hover:bg-[#e6e8ea] transition-colors cursor-pointer border border-[#c6c5d2]"
            >
              <Download className="w-3.5 h-3.5" /> 리포트 내보내기
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full zebra-table">
            <thead className="bg-[#f2f4f6] text-[#454651] font-mono text-xs border-b border-[#c6c5d2]">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">유형</th>
                <th className="px-6 py-4 text-left font-semibold">항목명 (Description)</th>
                <th className="px-6 py-4 text-left font-semibold">위치 / 도면번호</th>
                <th className="px-6 py-4 text-right font-semibold">예상 임팩트 (Impact)</th>
                <th className="px-6 py-4 text-center font-semibold">상태</th>
                <th className="px-6 py-4 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="font-body text-xs text-[#191c1e] divide-y divide-[#c6c5d2]">
              {filteredVeItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#eceef0] transition-colors">
                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-1 rounded-full ${
                        item.type === 'VE 제안'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-sm text-[#191c1e]">{item.description}</p>
                    <p className="text-[#454651] text-xs mt-0.5">{item.subDescription}</p>
                  </td>
                  <td className="px-6 py-4 text-[#454651] font-mono text-xs">{item.location}</td>
                  <td
                    className={`px-6 py-4 text-right font-mono font-bold text-sm ${
                      item.type === 'VE 제안' ? 'text-[#000d5f]' : 'text-[#ba1a1a]'
                    }`}
                  >
                    ₩ {item.impactKw.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded font-mono text-xs ${
                        item.status === '긴급 확인'
                          ? 'bg-red-100 text-red-800 font-bold'
                          : 'bg-[#e6e8ea] text-[#454651]'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedDetail(item)}
                      className="text-[#000d5f] hover:underline font-mono text-xs font-bold cursor-pointer"
                    >
                      상세보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-[#c6c5d2] flex justify-center bg-[#f7f9fb]">
          <nav className="flex gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded border border-[#c6c5d2] text-[#454651] hover:bg-[#eceef0]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-[#000d5f] text-white font-mono text-xs">
              1
            </button>

            <button className="w-8 h-8 flex items-center justify-center rounded border border-[#c6c5d2] text-[#454651] hover:bg-[#eceef0]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>

      {/* Floating Action / Print Button */}
      <button
        onClick={() => window.print()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#000d5f] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer"
        title="보고서 인쇄"
      >
        <Printer className="w-6 h-6" />
      </button>

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
            <div className="flex justify-between items-center border-b pb-3 border-[#c6c5d2]">
              <h3 className="font-headline font-bold text-base text-[#000d5f]">
                {selectedDetail.description}
              </h3>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-[#767682] hover:text-[#191c1e] text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-[#767682]">위치 / 도면번호: </span>
                <span className="font-mono text-[#191c1e]">{selectedDetail.location}</span>
              </div>
              <div>
                <span className="font-mono text-[#767682]">예상 금액 임팩트: </span>
                <span className="font-mono font-bold text-[#000d5f] text-sm">
                  ₩ {selectedDetail.impactKw.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-[#f2f4f6] rounded border border-[#c6c5d2]">
                <p className="font-bold mb-1 text-[#191c1e]">상세 설명</p>
                <p className="text-[#454651] leading-relaxed">{selectedDetail.subDescription}</p>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
