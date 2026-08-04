import React, { useState } from 'react';
import { ReviewItem, PageTab } from '../types';
import {
  Gavel,
  AlertTriangle,
  DollarSign,
  ZoomIn,
  ZoomOut,
  Layers,
  FileText,
  AlertOctagon,
  ExternalLink,
  Save,
  RotateCcw,
  Plus,
} from 'lucide-react';

interface DashboardViewProps {
  reviewItems: ReviewItem[];
  onSelectTab: (tab: PageTab) => void;
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  onUpdateReviewItem: (updated: ReviewItem) => void;
  searchQuery: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reviewItems,
  onSelectTab,
  onOpenCadViewer,
  onUpdateReviewItem,
  searchQuery,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(reviewItems[0]?.id || 'rev-1');
  const selectedItem = reviewItems.find((item) => item.id === selectedItemId) || reviewItems[0];

  const [engineerNotes, setEngineerNotes] = useState<string>(selectedItem?.engineerNotes || '');
  const [currentStatus, setCurrentStatus] = useState<string>(selectedItem?.status || '오류 의심');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Filter items by search query
  const filteredItems = reviewItems.filter(
    (item) =>
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.result.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reviewType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectRow = (item: ReviewItem) => {
    setSelectedItemId(item.id);
    setEngineerNotes(item.engineerNotes || '');
    setCurrentStatus(item.status);
    setIsSaved(false);
  };

  const handleSaveNotes = () => {
    if (!selectedItem) return;
    const updated = {
      ...selectedItem,
      engineerNotes,
      status: currentStatus as ReviewItem['status'],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    onUpdateReviewItem(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Safety & Law */}
        <div
          onClick={() => onSelectTab('safety')}
          className="bg-white border border-[#c6c5d2] p-5 rounded-lg hover:border-[#000d5f] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">gavel</span>
              법규 및 안전
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              최신
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">12</p>
            </div>
            <div className="bg-amber-50 p-3 rounded border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">08</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">145</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">미검토</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">02</p>
            </div>
          </div>
        </div>

        {/* Engineering Errors */}
        <div
          onClick={() => onSelectTab('errors')}
          className="bg-white border border-[#c6c5d2] p-5 rounded-lg hover:border-[#000d5f] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">error_outline</span>
              설계 오류
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              진행중
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">24</p>
            </div>
            <div className="bg-amber-50 p-3 rounded border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">15</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">89</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">미검토</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">11</p>
            </div>
          </div>
        </div>

        {/* Cost & VE */}
        <div
          onClick={() => onSelectTab('cost_ve')}
          className="bg-white border border-[#c6c5d2] p-5 rounded-lg hover:border-[#000d5f] transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="material-symbols-outlined text-xl">payments</span>
              공사비 및 VE
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              보류
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">05</p>
            </div>
            <div className="bg-amber-50 p-3 rounded border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">19</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">54</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">미검토</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">32</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Findings Table */}
      <div className="bg-white border border-[#c6c5d2] rounded-lg overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] flex justify-between items-center bg-[#f7f9fb]">
          <h4 className="font-headline font-bold text-base text-[#000d5f]">최근 검토 항목</h4>
          <div className="flex gap-2">
            <button
              onClick={() => onSelectTab('upload')}
              className="px-4 py-1.5 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              새 문서 업로드
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse zebra-table">
            <thead>
              <tr className="bg-[#f2f4f6] border-b border-[#c6c5d2]">
                <th className="px-6 py-3 font-mono text-xs text-[#454651]">파일명</th>
                <th className="px-6 py-3 font-mono text-xs text-[#454651]">검토 유형</th>
                <th className="px-6 py-3 font-mono text-xs text-[#454651]">분석 상태</th>
                <th className="px-6 py-3 font-mono text-xs text-[#454651]">검토 결과</th>
                <th className="px-6 py-3 font-mono text-xs text-[#454651]">최종 업데이트</th>
                <th className="px-6 py-3 font-mono text-xs text-[#454651] text-right">상세보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c5d2]">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleSelectRow(item)}
                  className={`hover:bg-[#eceef0] transition-colors cursor-pointer ${
                    selectedItemId === item.id ? 'bg-[#dfe0ff]/40 font-medium' : ''
                  }`}
                >
                  <td className="px-6 py-4 font-body text-sm text-[#000d5f] font-medium">
                    {item.fileName}
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-[#191c1e]">{item.reviewType}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                        item.status === '오류 의심'
                          ? 'bg-red-100 text-red-800'
                          : item.status === '주의'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-body text-sm text-[#191c1e]">{item.result}</td>
                  <td className="px-6 py-4 font-body text-xs text-[#454651]">{item.updatedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(item);
                        if (item.reviewType === '설계 오류') {
                          onOpenCadViewer(item.fileName, 'ERR-STR-021');
                        }
                      }}
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
      </div>

      {/* Split View Panel (Lower Half) */}
      {selectedItem && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[580px]">
          {/* Left: Original CAD Document View */}
          <div className="bg-white border border-[#c6c5d2] rounded-lg flex flex-col overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f2f4f6] flex justify-between items-center">
              <h5 className="font-headline font-bold text-sm text-[#191c1e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#000d5f]" />
                원본 도면 보기 ({selectedItem.fileName})
              </h5>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onOpenCadViewer(selectedItem.fileName, 'ERR-STR-021')}
                  className="px-3 py-1 bg-[#000d5f] text-white text-xs font-mono font-bold rounded hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  전체 CAD 뷰어
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#1A1A1A] relative flex items-center justify-center p-6 overflow-hidden min-h-[400px]">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              ></div>

              <img
                src={
                  selectedItem.cadUrl ||
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuAjbzfGI-oTYBygbRTWR10_iUWHBinTL3_xxn_QSsEJxyzTBHaniWQq38PhzKE8f2sVJubk4T3mNJWMnbVI1ubO2UykG5lOQMm_Hvyj1bbrWg9mmetOEDoLDQmEy_7F1Ae-o5xWkWkWEh9dPWOMm6MDECQOQjAo38RXwTgXxmm1FOHnfvxnYFXHqvMGGbKxV9XClru3cSUh6iKG6EY5TJWqjrNS33ev2_tE_7MwQ1ZJ_VjFLT5U3GjK5Q'
                }
                alt="CAD Engineering Blueprint"
                className="max-w-full max-h-[450px] object-contain shadow-2xl rounded border border-white/10"
              />
            </div>
          </div>

          {/* Right: Review Findings & Editor Panel */}
          <div className="bg-white border border-[#c6c5d2] rounded-lg flex flex-col shadow-xs">
            <div className="px-6 py-4 border-b border-[#c6c5d2] flex justify-between items-center bg-[#f7f9fb]">
              <h5 className="font-headline font-bold text-base text-[#ba1a1a] flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-[#ba1a1a]" />
                중대 결함 발견
              </h5>
              <span className="font-mono text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold">
                우선순위: 높음
              </span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  분석 내용
                </h6>
                <p className="font-body text-sm leading-relaxed text-[#191c1e] bg-[#f2f4f6] p-4 rounded-lg border-l-4 border-[#000d5f]">
                  {selectedItem.description ||
                    '배치도와 장비 리스트의 설비 수량 불일치. GA 도면에는 펌프 2대가 표시되어 있으나, 최신 P&ID(PID-602) 및 장비 리스트에는 예비 펌프(P-101C)를 포함한 3대가 명시됨.'}
                </p>
              </section>

              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  분석 근거 (CROSS-REFERENCE)
                </h6>
                <div className="space-y-2">
                  {(selectedItem.crossReferences || [
                    { title: 'PID-602_Rev04.pdf', type: 'pdf' },
                    { title: 'Equipment_List_V3.2.xlsx', type: 'xlsx' },
                  ]).map((ref, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border border-[#c6c5d2] rounded-lg hover:bg-[#f2f4f6] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#000d5f]">
                          {ref.type === 'pdf' ? 'picture_as_pdf' : 'description'}
                        </span>
                        <span className="font-body text-xs text-[#191c1e] font-medium">
                          {ref.title}
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#767682] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  상태 설정
                </h6>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentStatus('오류 의심')}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold border-2 transition-all cursor-pointer ${
                      currentStatus === '오류 의심'
                        ? 'border-[#ba1a1a] bg-red-50 text-red-800'
                        : 'border-[#c6c5d2] text-[#454651] hover:bg-[#f2f4f6]'
                    }`}
                  >
                    오류 의심
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStatus('검토 완료')}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      currentStatus === '검토 완료'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-[#c6c5d2] text-[#454651] hover:bg-[#f2f4f6]'
                    }`}
                  >
                    검토 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStatus('정상')}
                    className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      currentStatus === '정상'
                        ? 'border-[#000d5f] bg-[#dfe0ff] text-[#000d5f]'
                        : 'border-[#c6c5d2] text-[#454651] hover:bg-[#f2f4f6]'
                    }`}
                  >
                    무시 (정상)
                  </button>
                </div>
              </section>

              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  엔지니어 메모
                </h6>
                <textarea
                  value={engineerNotes}
                  onChange={(e) => setEngineerNotes(e.target.value)}
                  placeholder="수정 사항이나 검토 의견을 입력하세요..."
                  className="w-full h-28 p-3 bg-[#f7f9fb] border border-[#c6c5d2] rounded-lg focus:border-[#000d5f] focus:ring-1 focus:ring-[#000d5f] outline-none transition-all font-body text-xs text-[#191c1e]"
                />
              </section>
            </div>

            <div className="p-4 border-t border-[#c6c5d2] bg-[#f2f4f6] flex justify-end gap-3 items-center">
              {isSaved && (
                <span className="text-xs font-mono font-bold text-emerald-700 animate-fadeIn">
                  저장되었습니다!
                </span>
              )}
              <button
                onClick={() => {
                  setEngineerNotes(selectedItem.engineerNotes || '');
                  setCurrentStatus(selectedItem.status);
                }}
                className="px-4 py-2 border border-[#c6c5d2] rounded-lg font-mono text-xs text-[#454651] hover:bg-[#e6e8ea] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                변경사항 취소
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-5 py-2 bg-[#000d5f] text-white rounded-lg font-mono text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                저장 및 내보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
