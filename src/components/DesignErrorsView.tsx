import React, { useState } from 'react';
import { DesignErrorItem } from '../types';
import {
  FolderOpen,
  TrendingUp,
  Search,
  Filter,
  Download,
  Eye,
  Sparkles,
  ArrowRight,
  BarChart2,
  AlertTriangle,
} from 'lucide-react';

interface DesignErrorsViewProps {
  designErrors: DesignErrorItem[];
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  searchQuery: string;
}

export const DesignErrorsView: React.FC<DesignErrorsViewProps> = ({
  designErrors,
  onOpenCadViewer,
  searchQuery,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showAiSuggestionModal, setShowAiSuggestionModal] = useState(false);

  const query = localSearch || searchQuery;

  const filteredErrors = designErrors.filter((item) => {
    const matchesQuery =
      item.errorCode.toLowerCase().includes(query.toLowerCase()) ||
      item.dwgFile.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase());

    if (typeFilter === 'ALL') return matchesQuery;
    return matchesQuery && item.type === typeFilter;
  });

  const handleExportCsv = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      '오류코드,소스도면,설명,유형,심각도\n' +
      designErrors
        .map((e) => `"${e.errorCode}","${e.dwgFile}","${e.description}","${e.type}","${e.severity}"`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'POSCO_Engineering_Errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header with Project Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-headline text-2xl font-bold text-[#000d5f]">설계 오류 상세</h2>
            <div className="h-5 w-px bg-[#c6c5d2]"></div>
            <div className="flex items-center gap-1.5 bg-[#eceef0] px-3 py-1 rounded-full text-xs font-mono text-[#454651]">
              <FolderOpen className="w-3.5 h-3.5 text-[#000d5f]" />
              <span>P-2024-STEEL-001 Project</span>
            </div>
          </div>
          <p className="text-xs font-body text-[#454651] mt-1">
            AI 모델이 검출한 3D/2D CAD 도면 및 엔지니어링 설계 규격 위반 사항 목록입니다.
          </p>
        </div>
      </div>

      {/* Summary Header Cards (4 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <span className="text-[#454651] font-mono text-xs">전체 발견 오류</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold font-headline text-[#000d5f] leading-none">42</span>
            <span className="text-[#ba1a1a] font-mono text-xs font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> 12%
            </span>
          </div>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#000d5f]" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ba1a1a]"></div>
            <span className="text-[#454651] font-mono text-xs">구조 설계 오류</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">18</span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#ba1a1a]" style={{ width: '42%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
            <span className="text-[#454651] font-mono text-xs">전기/계장 오류</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">15</span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#f59e0b]" style={{ width: '35%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#767682]"></div>
            <span className="text-[#454651] font-mono text-xs">기타 상세 오류</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">09</span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#767682]" style={{ width: '21%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#c6c5d2] rounded-lg overflow-hidden shadow-xs flex flex-col">
        <div className="p-6 border-b border-[#c6c5d2] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#f7f9fb]">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#191c1e]">정밀 분석 리스트</h3>
            <p className="text-[#454651] font-body text-xs mt-0.5">
              AI 모델이 검출한 엔지니어링 설계 규격 위반 사항 및 도면 뷰어 링크
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="오류 내용 검색..."
                className="pl-9 pr-3 py-1.5 border border-[#c6c5d2] rounded bg-[#f2f4f6] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#000d5f] w-56"
              />
              <Search className="w-4 h-4 text-[#767682] absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="py-1.5 px-3 border border-[#c6c5d2] rounded bg-[#f2f4f6] text-xs font-mono outline-none"
            >
              <option value="ALL">전체 유형</option>
              <option value="Structural">Structural (구조)</option>
              <option value="Electrical">Electrical (전기)</option>
              <option value="Other">Other (기타)</option>
            </select>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c6c5d2] rounded bg-white text-xs font-mono hover:bg-[#eceef0] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              보고서 내보내기
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f2f4f6] font-mono text-xs text-[#454651]">
              <tr>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">오류 코드</th>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">소스 도면 (.dwg)</th>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">오류 상세 설명</th>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">유형</th>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold text-center">심각도</th>
                <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold text-right">도면 뷰어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d2]">
              {filteredErrors.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`hover:bg-[#eceef0] transition-colors ${
                    idx % 2 === 1 ? 'bg-[#f2f4f6]/50' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs text-[#000d5f] font-bold">
                    {item.errorCode}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#000d5f] text-lg">
                        architecture
                      </span>
                      <span className="font-body text-xs font-medium text-[#191c1e]">
                        {item.dwgFile}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-body text-xs text-[#191c1e] leading-relaxed">
                      {item.description}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#e6e8ea] text-[#454651] rounded text-[10px] font-mono font-bold uppercase">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                        item.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : item.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-[#e0e3e5] text-[#454651]'
                      }`}
                    >
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onOpenCadViewer(item.dwgFile, item.errorCode)}
                      className="p-1.5 text-[#000d5f] hover:bg-[#dfe0ff] rounded transition-all cursor-pointer"
                      title="CAD 도면 뷰어 열기"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 bg-white border-t border-[#c6c5d2] flex justify-between items-center text-xs font-mono text-[#454651]">
          <span>전체 42건 중 {filteredErrors.length}건 표시</span>
          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1 bg-[#000d5f] text-white rounded font-bold">1</span>
            <span className="px-3 py-1 hover:bg-[#eceef0] rounded cursor-pointer">2</span>
            <span className="px-3 py-1 hover:bg-[#eceef0] rounded cursor-pointer">3</span>
            <span>...</span>
            <span className="px-3 py-1 hover:bg-[#eceef0] rounded cursor-pointer">9</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Trend Chart + AI Recommendation Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-white border border-[#c6c5d2] rounded-lg p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-[#000d5f]" />
              <h4 className="font-headline font-bold text-base text-[#191c1e]">최근 검토 트렌드</h4>
            </div>
            <select className="bg-transparent border border-[#c6c5d2] rounded px-2 py-1 text-xs font-mono outline-none">
              <option>지난 30일</option>
              <option>지난 90일</option>
            </select>
          </div>

          <div className="h-44 w-full flex items-end gap-2 px-2 pb-2">
            {[60, 45, 75, 30, 90, 55, 40, 65, 50, 80, 35, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-[#dfe0ff] hover:bg-[#000d5f] rounded-t transition-all cursor-pointer group relative"
                style={{ height: `${h}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#191c1e] text-white text-[10px] font-mono px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  {h}건
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 px-2 text-[10px] font-mono text-[#454651] uppercase tracking-wider">
            <span>1월 15일</span>
            <span>1월 22일</span>
            <span>1월 29일</span>
            <span>2월 5일</span>
            <span>2월 12일</span>
          </div>
        </div>

        {/* AI Banner */}
        <div className="lg:col-span-4 bg-[#000d5f] text-white rounded-lg p-6 flex flex-col justify-between relative overflow-hidden shadow-md">
          <div className="relative z-10 space-y-3">
            <Sparkles className="w-8 h-8 text-[#bbc3ff]" />
            <h4 className="font-headline font-bold text-lg">AI 지능형 보정 제안</h4>
            <p className="font-body text-xs opacity-90 leading-relaxed text-[#dfe0ff]">
              검출된 철근 배근율 오류에 대해 KDS 14 20:2021 규격을 기반으로 한 최적 단면 재설계안이 준비되었습니다.
            </p>
          </div>

          <button
            onClick={() => setShowAiSuggestionModal(true)}
            className="relative z-10 mt-6 bg-white text-[#000d5f] font-mono font-bold text-xs py-3 rounded hover:bg-[#eceef0] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            제안 리포트 확인
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* AI Suggestion Modal */}
      {showAiSuggestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
            <div className="flex justify-between items-center border-b pb-3 border-[#c6c5d2]">
              <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#000d5f]" />
                KDS 14 20:2021 기반 AI 보정 리포트
              </h3>
              <button
                onClick={() => setShowAiSuggestionModal(false)}
                className="text-[#767682] hover:text-[#191c1e] font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#191c1e]">
              <div className="p-3 bg-[#f2f4f6] rounded border border-[#c6c5d2]">
                <p className="font-bold text-[#000d5f] mb-1">ERR-STR-021 기둥 단면 제안</p>
                <p className="text-[#454651] leading-relaxed">
                  기존 800x800mm (배근율 5.2%) 단면을 900x900mm (SD600 철근 적용)로 변경 시 배근율이 3.6%로 감소하여 KDS 규격을 충족합니다.
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                <p className="font-bold mb-0.5">예상 효과</p>
                <p>시공성 개선, 콘크리트 충전성 25% 향상, 시공 하자 위험 제거</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  alert('설계 보정안이 CAD 모델 및 보정 문서로 등록되었습니다.');
                  setShowAiSuggestionModal(false);
                }}
                className="px-4 py-2 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90"
              >
                보정안 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
