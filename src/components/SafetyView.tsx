import React, { useState } from 'react';
import { SafetyItem } from '../types';
import {
  FileText,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Download,
  ArrowRight,
  TrendingUp,
  BarChart2,
  Activity,
} from 'lucide-react';

interface SafetyViewProps {
  safetyItems: SafetyItem[];
  searchQuery: string;
}

export const SafetyView: React.FC<SafetyViewProps> = ({ safetyItems, searchQuery }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedItemDetail, setSelectedItemDetail] = useState<SafetyItem | null>(null);

  const filteredItems = safetyItems.filter((item) => {
    const matchesSearch =
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lawRegulation.toLowerCase().includes(searchQuery.toLowerCase());

    if (severityFilter === 'ALL') return matchesSearch;
    return matchesSearch && item.severity === severityFilter;
  });

  const handleExportReport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      '파일명,검토일시,요약,위반법규,심각도,상태\n' +
      safetyItems
        .map(
          (i) =>
            `"${i.fileName}","${i.reviewedAt}","${i.summary}","${i.lawRegulation}","${i.severity}","${i.status}"`
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'POSCO_Safety_Review_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div>
        <h2 className="font-headline text-2xl font-bold text-[#000d5f]">법규 및 안전 상세</h2>
        <p className="text-xs font-body text-[#454651] mt-1">
          최신 AI 분석 결과 및 산업안전보건법, 소방법, 전기안전관리법 준수 여부 리포트입니다.
        </p>
      </div>

      {/* 4 Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs hover:border-[#000d5f] transition-all">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs font-medium text-[#454651]">총 검토 파일</span>
            <FileText className="w-5 h-5 text-[#000d5f]" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-headline leading-tight text-[#191c1e]">1,248</h3>
            <p className="text-xs font-mono text-[#000d5f] flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              지난달 대비 12% 증가
            </p>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-[#ba1a1a] border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs font-medium text-[#454651]">위반 의심</span>
            <AlertOctagon className="w-5 h-5 text-[#ba1a1a]" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-headline leading-tight text-[#ba1a1a]">24</h3>
            <p className="text-xs font-mono text-[#ba1a1a] font-bold mt-1">즉시 조치 필요</p>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-[#f59e0b] border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs font-medium text-[#454651]">주의 사항</span>
            <AlertTriangle className="w-5 h-5 text-[#f59e0b]" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-headline leading-tight text-[#d97706]">56</h3>
            <p className="text-xs font-mono text-[#d97706] font-bold mt-1">세부 확인 권고</p>
          </div>
        </div>

        <div className="bg-white border-l-4 border-l-emerald-600 border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-start">
            <span className="font-mono text-xs font-medium text-[#454651]">준수 완료</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold font-headline leading-tight text-emerald-700">1,168</h3>
            <p className="text-xs font-mono text-emerald-700 font-bold mt-1">검토 통과</p>
          </div>
        </div>
      </div>

      {/* Findings Table Section */}
      <div className="bg-white border border-[#c6c5d2] rounded-lg overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[#c6c5d2] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#f7f9fb]">
          <div>
            <h4 className="font-headline text-lg font-bold text-[#191c1e]">검토 상세 리스트</h4>
            <p className="font-body text-xs text-[#454651] mt-0.5">
              법규 준수 여부 및 AI 위반 의심 자동 감지 내역
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 px-3 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg text-xs font-mono focus:ring-1 focus:ring-[#000d5f] outline-none"
            >
              <option value="ALL">전체 심각도</option>
              <option value="위험">위험 (High)</option>
              <option value="주의">주의 (Medium)</option>
              <option value="정상">정상 (Normal)</option>
            </select>

            <button
              onClick={() => setSeverityFilter('ALL')}
              className="flex items-center gap-1.5 h-9 px-3 bg-[#f2f4f6] border border-[#c6c5d2] rounded-lg text-xs font-mono hover:bg-[#e6e8ea] transition-colors cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              필터 초기화
            </button>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-1.5 h-9 px-4 bg-[#000d5f] text-white rounded-lg text-xs font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              보고서 추출
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e6e8ea]">
              <tr>
                <th className="px-6 py-4 font-mono text-xs text-[#454651] font-semibold">파일 정보</th>
                <th className="px-6 py-4 font-mono text-xs text-[#454651] font-semibold">검토 결과 요약</th>
                <th className="px-6 py-4 font-mono text-xs text-[#454651] font-semibold">위반 법규/안전기준</th>
                <th className="px-6 py-4 font-mono text-xs text-[#454651] font-semibold">심각도</th>
                <th className="px-6 py-4 font-mono text-xs text-[#454651] font-semibold text-right">조치</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d2]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#f2f4f6] transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.severity === '위험'
                            ? 'bg-red-100 text-red-800'
                            : item.severity === '주의'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          {item.fileType === 'PDF' ? 'picture_as_pdf' : item.fileType === 'DWG' ? 'architecture' : 'description'}
                        </span>
                      </div>
                      <div>
                        <div className="font-body text-sm font-bold text-[#191c1e]">{item.fileName}</div>
                        <div className="text-[11px] font-mono text-[#454651]">{item.reviewedAt}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-body text-xs text-[#191c1e] max-w-sm leading-relaxed">{item.summary}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs bg-[#e6e8ea] px-2.5 py-1 rounded text-[#191c1e] font-medium">
                      {item.lawRegulation}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold ${
                        item.severity === '위험'
                          ? 'bg-red-100 text-red-800'
                          : item.severity === '주의'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.severity === '위험'
                            ? 'bg-red-600'
                            : item.severity === '주의'
                            ? 'bg-amber-600'
                            : 'bg-emerald-600'
                        }`}
                      ></span>
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setSelectedItemDetail(item)}
                      className="text-[#000d5f] font-mono text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      상세 보기
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="px-6 py-4 bg-[#f2f4f6] border-t border-[#c6c5d2] flex justify-between items-center font-mono text-xs text-[#454651]">
          <span>총 1,248개 중 1 - {filteredItems.length}개 표시 중</span>
          <div className="flex items-center gap-1.5">
            <button className="w-7 h-7 flex items-center justify-center rounded border border-[#c6c5d2] hover:bg-[#e6e8ea]">1</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-[#c6c5d2] hover:bg-[#e6e8ea]">2</button>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-[#c6c5d2] hover:bg-[#e6e8ea]">3</button>
            <span>...</span>
            <button className="w-7 h-7 flex items-center justify-center rounded border border-[#c6c5d2] hover:bg-[#e6e8ea]">125</button>
          </div>
        </div>
      </div>

      {/* Analytics & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h5 className="font-headline text-base font-bold text-[#191c1e]">주요 위반 트렌드</h5>
            <BarChart2 className="w-5 h-5 text-[#454651]" />
          </div>

          <div className="h-56 flex items-end justify-between gap-6 px-6 pb-6 border-b border-[#c6c5d2]">
            <div className="flex-1 bg-[#000d5f]/20 rounded-t relative group hover:bg-[#000d5f]/30 transition-all" style={{ height: '80%' }}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold font-mono">82건</div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-[#454651] whitespace-nowrap">소방법</div>
            </div>
            <div className="flex-1 bg-[#000d5f]/20 rounded-t relative group hover:bg-[#000d5f]/30 transition-all" style={{ height: '45%' }}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold font-mono">46건</div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-[#454651] whitespace-nowrap">전기안전</div>
            </div>
            <div className="flex-1 bg-[#000d5f]/20 rounded-t relative group hover:bg-[#000d5f]/30 transition-all" style={{ height: '60%' }}>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold font-mono">62건</div>
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-[#454651] whitespace-nowrap">산안법</div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#c6c5d2] p-6 rounded-lg flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h5 className="font-headline text-base font-bold text-[#191c1e]">AI 분석 리포트 현황</h5>
            <Activity className="w-5 h-5 text-[#454651]" />
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between font-mono text-xs mb-1.5">
                <span className="text-[#454651]">전체 검토 진행률</span>
                <span className="font-bold text-[#000d5f]">94%</span>
              </div>
              <div className="w-full bg-[#e6e8ea] h-2 rounded-full overflow-hidden">
                <div className="bg-[#000d5f] h-full" style={{ width: '94%' }}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[#f2f4f6] p-4 rounded-lg text-center">
                <p className="font-mono text-xs text-[#454651] mb-1">평균 검토 시간</p>
                <p className="font-headline text-2xl font-bold text-[#000d5f]">1.2s</p>
              </div>
              <div className="bg-[#f2f4f6] p-4 rounded-lg text-center">
                <p className="font-mono text-xs text-[#454651] mb-1">자동 승인율</p>
                <p className="font-headline text-2xl font-bold text-[#000d5f]">76%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl p-6 space-y-4 border border-[#c6c5d2]">
            <div className="flex justify-between items-center border-b pb-3 border-[#c6c5d2]">
              <h3 className="font-headline font-bold text-base text-[#000d5f]">{selectedItemDetail.fileName}</h3>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="text-[#767682] hover:text-[#191c1e] text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-mono text-[#767682]">위반 법규: </span>
                <span className="font-bold font-mono bg-[#e6e8ea] px-2 py-0.5 rounded text-[#191c1e]">
                  {selectedItemDetail.lawRegulation}
                </span>
              </div>
              <div>
                <span className="font-mono text-[#767682]">검토 시간: </span>
                <span className="font-mono text-[#191c1e]">{selectedItemDetail.reviewedAt}</span>
              </div>
              <div className="p-3 bg-[#f2f4f6] rounded border border-[#c6c5d2]">
                <p className="font-bold mb-1 text-[#191c1e]">요약 내용</p>
                <p className="text-[#454651]">{selectedItemDetail.summary}</p>
              </div>
              {selectedItemDetail.details && (
                <div className="p-3 bg-red-50 text-red-900 rounded border border-red-200">
                  <p className="font-bold mb-1">AI 권고사항 및 세부 분석</p>
                  <p>{selectedItemDetail.details}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
