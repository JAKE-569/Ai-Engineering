import React from 'react';
import { SafetyItem, PageTab } from '../types';
import { ShieldAlert, FileText, CheckCircle, AlertTriangle, Eye, Plus, UploadCloud } from 'lucide-react';

interface SafetyViewProps {
  safetyItems: SafetyItem[];
  onOpenPdfViewer: (dwgFile: string) => void;
  onSelectTab?: (tab: PageTab) => void;
  searchQuery: string;
}

export const SafetyView: React.FC<SafetyViewProps> = ({
  safetyItems,
  onOpenPdfViewer,
  onSelectTab,
  searchQuery,
}) => {
  const filtered = safetyItems.filter(
    (item) =>
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.lawRegulation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#000d5f]">법규 및 안전 검토</h2>
          <p className="text-xs font-body text-[#454651] mt-1">
            산업안전보건법, 소방법 및 POSCO 안전 수칙에 관한 도면 OCR 검토 결과입니다.
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

      <div className="bg-white border border-[#c6c5d2] rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f7f9fb] flex justify-between items-center">
          <h3 className="font-headline font-bold text-base text-[#191c1e]">
            법규/안전 도면 검토 내역 ({filtered.length}건)
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-3">
            <UploadCloud className="w-10 h-10 mx-auto text-[#000d5f] opacity-60" />
            <h4 className="font-headline font-bold text-base text-[#191c1e]">
              등록된 안전 검토 항목이 없습니다.
            </h4>
            <p className="font-body text-xs text-[#454651] max-w-md mx-auto">
              도면 업로드 메뉴에서 실제 도면을 업로드하면 소방법 및 산업안전보건법 위반 여부가 AI로 자동 스캔됩니다.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f2f4f6] font-mono text-xs text-[#454651]">
                <tr>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">도면 파일명</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">관련 법규/수칙</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">검토 요약</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">위험도</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2]">조치 상태</th>
                  <th className="px-6 py-3.5 border-b border-[#c6c5d2] text-right">도면 보기</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2] text-xs font-body">
                {filtered.map((item, idx) => (
                  <tr key={item.id || `safety-${item.fileName}-${idx}`} className="hover:bg-[#f2f4f6]">
                    <td className="px-6 py-4 font-bold text-[#000d5f]">{item.fileName}</td>
                    <td className="px-6 py-4 font-mono text-[#454651]">{item.lawRegulation}</td>
                    <td className="px-6 py-4 text-[#191c1e]">{item.summary}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                          item.severity === '위험'
                            ? 'bg-red-100 text-red-800'
                            : item.severity === '주의'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#454651] font-mono">{item.status}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onOpenPdfViewer(item.fileName)}
                        className="p-1.5 text-[#000d5f] hover:bg-[#dfe0ff] rounded cursor-pointer"
                        title="PDF 도면 뷰어 열기"
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
    </div>
  );
};
