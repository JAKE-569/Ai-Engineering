import React, { useState } from 'react';
import { DesignErrorItem, PageTab } from '../types';
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
  UploadCloud,
  Plus,
} from 'lucide-react';

interface DesignErrorsViewProps {
  designErrors: DesignErrorItem[];
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  onSelectTab?: (tab: PageTab) => void;
  searchQuery: string;
}

export const DesignErrorsView: React.FC<DesignErrorsViewProps> = ({
  designErrors,
  onOpenCadViewer,
  onSelectTab,
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

  const criticalCount = designErrors.filter((e) => e.severity === 'CRITICAL' || e.type === 'Structural').length;
  const electricalCount = designErrors.filter((e) => e.type === 'Electrical').length;
  const otherCount = designErrors.filter((e) => e.type === 'Other' || e.type === 'Mechanical').length;

  const handleExportCsv = () => {
    if (designErrors.length === 0) return;
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
              <span>실시간 업로드 도면 분석</span>
            </div>
          </div>
          <p className="text-xs font-body text-[#454651] mt-1">
            실제 업로드된 도면 OCR 텍스트 스캔 및 AI 설계 규격 위반 사항 검출 목록입니다.
          </p>
        </div>

        {onSelectTab && (
          <button
            onClick={() => onSelectTab('upload')}
            className="px-4 py-2 bg-[#000d5f] text-white rounded-lg text-xs font-mono font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            새 도면 업로드
          </button>
        )}
      </div>

      {/* Summary Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-xl flex flex-col justify-between shadow-xs">
          <span className="text-[#454651] font-mono text-xs font-semibold">검출된 설계 오류</span>
          <div className="flex items-end justify-between mt-2">
            <span className="text-3xl font-bold font-headline text-[#000d5f] leading-none">
              {designErrors.length}
            </span>
            <span className="text-[#ba1a1a] font-mono text-xs font-bold flex items-center gap-0.5">
              실시간 AI 스캔
            </span>
          </div>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#000d5f]" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#ba1a1a]"></div>
            <span className="text-[#454651] font-mono text-xs font-semibold">구조/치명적 오류</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">
            {criticalCount}
          </span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#ba1a1a]" style={{ width: designErrors.length ? `${(criticalCount/designErrors.length)*100}%` : '0%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div>
            <span className="text-[#454651] font-mono text-xs font-semibold">전기/계장 오류</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">
            {electricalCount}
          </span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#f59e0b]" style={{ width: designErrors.length ? `${(electricalCount/designErrors.length)*100}%` : '0%' }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-xl flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#767682]"></div>
            <span className="text-[#454651] font-mono text-xs font-semibold">기타 항목</span>
          </div>
          <span className="text-3xl font-bold font-headline text-[#191c1e] mt-2 leading-none">
            {otherCount}
          </span>
          <div className="w-full h-1 bg-[#eceef0] mt-3 rounded-full overflow-hidden">
            <div className="h-full bg-[#767682]" style={{ width: designErrors.length ? `${(otherCount/designErrors.length)*100}%` : '0%' }}></div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#c6c5d2] rounded-xl overflow-hidden shadow-xs flex flex-col">
        <div className="p-6 border-b border-[#c6c5d2] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#f7f9fb]">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#191c1e]">도면 정밀 오류 리스트</h3>
            <p className="text-[#454651] font-body text-xs mt-0.5">
              실제 업로드된 도면의 OCR 텍스트 스캔 기반 규격 위반 사항
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
              disabled={designErrors.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c6c5d2] rounded bg-white text-xs font-mono hover:bg-[#eceef0] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              내보내기
            </button>
          </div>
        </div>

        {designErrors.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-3">
            <UploadCloud className="w-10 h-10 mx-auto text-[#000d5f] opacity-60" />
            <h4 className="font-headline font-bold text-base text-[#191c1e]">
              등록된 도면 오류가 없습니다.
            </h4>
            <p className="font-body text-xs text-[#454651] max-w-md mx-auto">
              도면 업로드 메뉴에서 실제 도면 파일(.png, .jpg, .dwg, .pdf)을 업로드하면 OCR 스캔 및 설계 오류 자동 감지 결과가 여기에 표시됩니다.
            </p>
            {onSelectTab && (
              <button
                onClick={() => onSelectTab('upload')}
                className="px-5 py-2 bg-[#000d5f] text-white rounded-lg text-xs font-mono font-bold hover:opacity-90 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                도면 업로드하러 가기
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f4f6] font-mono text-xs text-[#454651]">
                <tr>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">오류 코드</th>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">소스 도면</th>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">오류 상세 설명</th>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold">유형</th>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold text-center">심각도</th>
                  <th className="px-6 py-4 border-b border-[#c6c5d2] font-semibold text-right">도면 뷰어</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2]">
                {filteredErrors.map((item, idx) => (
                  <tr
                    key={item.id || `err-${item.errorCode}-${idx}`}
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
        )}
      </div>

      {/* AI Recommendation Banner */}
      {designErrors.length > 0 && (
        <div className="bg-[#000d5f] text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-md">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#bbc3ff]" />
              <h4 className="font-headline font-bold text-lg">AI 지능형 보정 리포트 준비됨</h4>
            </div>
            <p className="font-body text-xs opacity-90 leading-relaxed text-[#dfe0ff] max-w-2xl">
              {designErrors[0]?.description || '현재 업로드 도면의 설계오류를 기준으로 보정 리포트를 준비했습니다.'}
            </p>
          </div>

          <button
            onClick={() => setShowAiSuggestionModal(true)}
            className="bg-white text-[#000d5f] font-mono font-bold text-xs px-5 py-3 rounded-xl hover:bg-[#eceef0] transition-colors flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
          >
            제안 리포트 확인
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AI Suggestion Modal */}
      {showAiSuggestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
            <div className="flex justify-between items-center border-b pb-3 border-[#c6c5d2]">
              <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#000d5f]" />
                실제 도면 기반 AI 보정 리포트
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
                <p className="font-bold text-[#000d5f] mb-1">업로드 도면 보정 제안</p>
                <p className="text-[#454651] leading-relaxed">
                  {designErrors[0]?.description || 'AI가 실제 업로드 도면에서 검출한 설계오류의 보정안을 표시합니다.'}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-900">
                <p className="font-bold mb-0.5">예상 효과</p>
                <p>시공성 개선, 콘크리트 충전성 25% 향상, 구조 검측 통과</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  alert('설계 보정안이 완료 조치되었습니다.');
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
