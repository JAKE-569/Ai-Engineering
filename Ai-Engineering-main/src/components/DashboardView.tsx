import React, { useState } from 'react';
import { ReviewItem, PageTab, UploadFile } from '../types';
import { DrawingCanvasPreview } from './DrawingCanvasPreview';
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
  ScanText,
  FolderOpen,
  UploadCloud,
} from 'lucide-react';

interface DashboardViewProps {
  reviewItems: ReviewItem[];
  uploadFiles?: UploadFile[];
  onSelectTab: (tab: PageTab) => void;
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  onOpenOcrModal?: (file: ReviewItem) => void;
  onUpdateReviewItem: (updated: ReviewItem) => void;
  searchQuery: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reviewItems,
  uploadFiles = [],
  onSelectTab,
  onOpenCadViewer,
  onOpenOcrModal,
  onUpdateReviewItem,
  searchQuery,
}) => {
  const compact = (value?: string, max = 180) => {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    const sentence = text.slice(0, max).replace(/[,;|].*$/, '').trim();
    return `${sentence || text.slice(0, max).trim()}…`;
  };
  const [selectedItemId, setSelectedItemId] = useState<string>(reviewItems[0]?.id || '');
  const selectedItem = reviewItems.find((item) => item.id === selectedItemId) || reviewItems[0];
  const selectedSource = selectedItem ? uploadFiles.find((file) => file.name === selectedItem.fileName) : undefined;
  const drawingDataUrl = selectedItem?.fileDataUrl || selectedItem?.cadUrl || selectedSource?.fileDataUrl;

  const [engineerNotes, setEngineerNotes] = useState<string>(selectedItem?.engineerNotes || '');
  const [currentStatus, setCurrentStatus] = useState<string>(selectedItem?.status || '오류 의심');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Dynamic status counters based on actual review items
  const errorCount = reviewItems.filter((i) => i.status === '오류 의심' || i.status === '긴급 확인').length;
  const warningCount = reviewItems.filter((i) => i.status === '주의' || i.status === '검토중').length;
  const normalCount = reviewItems.filter((i) => i.status === '정상' || i.status === '검토 완료').length;
  const unreviewedCount = reviewItems.filter((i) => i.status === '미검토' || i.status === '검토대기').length;

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
          className="bg-blue-50 border border-blue-200 p-5 rounded-xl hover:border-blue-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="dashboard-card-icon dashboard-card-icon--safety material-symbols-outlined text-xl">gavel</span>
              법규 및 안전 검토
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              실시간
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">{errorCount}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">{warningCount}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">{normalCount}</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded-lg border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">미검토</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">{unreviewedCount}</p>
            </div>
          </div>
        </div>

        {/* Engineering Errors */}
        <div
          onClick={() => onSelectTab('errors')}
          className="bg-red-50 border border-red-200 p-5 rounded-xl hover:border-red-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="dashboard-card-icon dashboard-card-icon--error material-symbols-outlined text-xl">error_outline</span>
              설계 오류 검토
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              OCR 연동
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">{errorCount}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">{warningCount}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">{normalCount}</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded-lg border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">전체 도면</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">{reviewItems.length}</p>
            </div>
          </div>
        </div>

        {/* Cost & VE */}
        <div
          onClick={() => onSelectTab('cost_ve')}
          className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl hover:border-emerald-500 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2">
              <span className="dashboard-card-icon dashboard-card-icon--cost material-symbols-outlined text-xl">payments</span>
              공사비 및 VE 분석
            </h3>
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#eceef0] text-[#454651] rounded font-medium">
              최적화
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 p-3 rounded-lg border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="text-2xl font-bold font-headline text-[#93000a]">{errorCount}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="text-2xl font-bold font-headline text-amber-700">{warningCount}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="text-2xl font-bold font-headline text-emerald-700">{normalCount}</p>
            </div>
            <div className="bg-[#f2f4f6] p-3 rounded-lg border border-[#c6c5d2]">
              <p className="text-[10px] text-[#454651] font-bold font-mono">VE 제안</p>
              <p className="text-2xl font-bold font-headline text-[#191c1e]">{reviewItems.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Review Findings Table */}
      <div className="bg-white border border-[#c6c5d2] rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] flex justify-between items-center bg-[#f7f9fb]">
          <div>
            <h4 className="font-headline font-bold text-base text-[#000d5f]">
              업로드 도면 검토 목록
            </h4>
            <p className="font-body text-xs text-[#454651] mt-0.5">
              실제 업로드된 도면의 OCR 스캔 결과 및 AI 엔지니어링 검토 항목
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onSelectTab('upload')}
              className="px-4 py-2 bg-[#000d5f] text-white rounded-lg text-xs font-mono font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              실제 도면 업로드
            </button>
          </div>
        </div>

        {reviewItems.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#dfe0ff] flex items-center justify-center text-[#000d5f]">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-headline font-bold text-lg text-[#191c1e]">
                검토할 업로드 도면이 없습니다.
              </h3>
              <p className="font-body text-xs text-[#454651] mt-1 max-w-md mx-auto">
                '도면 업로드' 메뉴에서 도면 이미지나 CAD/PDF 문서를 업로드하면 OCR 기반 도면검토가 실행됩니다.
              </p>
            </div>
            <button
              onClick={() => onSelectTab('upload')}
              className="px-6 py-2.5 bg-[#000d5f] text-white rounded-xl text-xs font-mono font-bold hover:opacity-90 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              첫 번째 도면 업로드하기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse zebra-table">
              <thead>
                <tr className="bg-[#f2f4f6] border-b border-[#c6c5d2]">
                  <th className="px-6 py-3 font-mono text-xs text-[#454651]">도면 / 파일명</th>
                  <th className="px-6 py-3 font-mono text-xs text-[#454651]">검토 유형</th>
                  <th className="px-6 py-3 font-mono text-xs text-[#454651]">분석 상태</th>
                  <th className="px-6 py-3 font-mono text-xs text-[#454651]">OCR 도면검토 결과</th>
                  <th className="px-6 py-3 font-mono text-xs text-[#454651]">업데이트 일시</th>
                  <th className="px-6 py-3 font-mono text-xs text-[#454651] text-right">상세 및 OCR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2]">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.id || `rev-${item.fileName}-${idx}`}
                    onClick={() => handleSelectRow(item)}
                    className={`hover:bg-[#eceef0] transition-colors cursor-pointer ${
                      selectedItemId === item.id ? 'bg-[#dfe0ff]/40 font-medium' : ''
                    }`}
                  >
                    <td className="px-6 py-4 font-body text-sm text-[#000d5f] font-bold">
                      <div className="flex items-center gap-3">
                        {item.fileDataUrl && item.fileDataUrl.startsWith('data:image/') ? (
                          <img
                            src={item.fileDataUrl}
                            alt="Drawing preview"
                            className="w-9 h-9 object-cover rounded border border-[#c6c5d2]"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[#000d5f] text-xl">
                            architecture
                          </span>
                        )}
                        <div>
                          <span>{item.fileName}</span>
                          <span className="text-[11px] font-mono text-[#454651] block font-normal">
                            {item.drawingTitle || item.fileName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-body text-sm text-[#191c1e]">{item.reviewType}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                          item.status === '오류 의심' || item.status === '긴급 확인'
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
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(item);
                          onOpenCadViewer(item.fileName, 'ERR-STR-021');
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
        )}
      </div>

      {/* Split View Panel (Lower Half) */}
      {selectedItem && (
        <div className="dashboard-review-layout relative grid min-h-[580px] grid-cols-1 gap-6">
          {/* Left: Original CAD / Image Document View */}
          <div className="dashboard-source-card bg-white border border-[#c6c5d2] rounded-xl flex flex-col overflow-hidden shadow-xs">
            <div className="dashboard-source-header px-6 py-4 border-b border-[#c6c5d2] bg-[#f2f4f6] flex justify-between items-center">
              <h5 className="font-headline font-bold text-sm text-[#191c1e] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#000d5f]" />
                업로드 도면 원본 ({selectedItem.fileName})
              </h5>
              <div className="flex gap-1.5">
                <button onClick={() => setIsReportOpen(true)} className="px-3 py-1 bg-slate-900 text-white text-xs font-bold rounded">종합 보고서</button>
                {onOpenOcrModal && (
                  <button
                    onClick={() => onOpenOcrModal(selectedItem)}
                    className="hidden px-3 py-1 bg-[#dfe0ff] text-[#000d5f] text-xs font-mono font-bold rounded hover:bg-[#000d5f] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <ScanText className="w-3.5 h-3.5" />
                    OCR 레이어 스캔
                  </button>
                )}
                <button
                  onClick={() => onOpenCadViewer(selectedItem.fileName, 'ERR-STR-021')}
                  className="px-3 py-1 bg-[#000d5f] text-white text-xs font-mono font-bold rounded hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  도면 워크스페이스
                </button>
              </div>
            </div>

            {selectedItem.reviewNarrative && (
              <div className="dashboard-summary-strip grid grid-cols-1 gap-3 border-b border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
                {selectedItem.reviewNarrative.drawingOverview && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><b className="text-xs text-blue-700">도면 개요</b><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-800">{compact(selectedItem.reviewNarrative.drawingOverview, 180)}</p></div>}
                <div className="rounded-lg border border-slate-200 bg-white p-3"><div className="flex items-center justify-between"><b className="text-xs text-slate-900">핵심 검토 항목</b><span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-800">{selectedItem.reviewNarrative.checklistReview?.length || 0}건</span></div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-700">설계·안전·법규 검토 결과를 확인하세요.</p></div>
                {selectedItem.reviewNarrative.overallOpinion && <div className={`rounded-lg border p-3 ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'border-red-200 bg-red-50' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex items-center justify-between"><b className={`text-xs ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'text-red-700' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'text-amber-700' : 'text-emerald-700'}`}>종합 판단</b><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'bg-red-100 text-red-700' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? '심각' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? '주의' : '양호'}</span></div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-800">{compact(selectedItem.reviewNarrative.overallOpinion, 180)}</p></div>}
              </div>
            )}
            <div className="dashboard-drawing-stage flex-1 bg-slate-200 relative flex items-center justify-center p-3 overflow-hidden min-h-[400px]">
              <DrawingCanvasPreview
                fileDataUrl={drawingDataUrl}
                cadUrl={drawingDataUrl}
                previewPages={selectedItem.previewPages || selectedSource?.previewPages}
                drawingTitle={selectedItem.drawingTitle || selectedItem.fileName}
                drawingNumber={selectedItem.drawingNumber || 'DWG-SCAN'}
                scale={selectedItem.scale || '1 : 100'}
                fileName={selectedItem.fileName}
                className="w-full h-full"
                maxHeight="460px"
              />
            </div>
          </div>

          {/* Right: compact core review panel */}
          <aside className="dashboard-core-panel max-h-[680px] w-[360px] overflow-y-auto rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
            <div className="mb-4 border-b border-slate-200 pb-3"><h5 className="text-base font-bold text-slate-900">핵심 검토 항목</h5><p className="mt-1 text-xs text-slate-500">도면 프레임과 분리된 검토 목록</p></div>
            <div className="space-y-3">
              {(selectedItem.reviewNarrative?.checklistReview || []).map((item) => <div key={`${item.number}-${item.topic}`} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><b className="text-xs leading-5 text-slate-900">{item.number}. {compact(item.topic, 110)}</b><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'FAIL' ? 'bg-red-100 text-red-700' : item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status === 'FAIL' ? '심각' : item.status === 'PASS' ? '양호' : '주의'}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{compact(item.observation, 180)}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">근거: {compact(item.legalBasis, 100)}</p></div>)}
              {!(selectedItem.reviewNarrative?.checklistReview?.length) && <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">검토 항목이 없습니다.</div>}
            </div>
          </aside>

          {/* Hidden legacy editor panel retained for compatibility */}
          <div className="hidden bg-white border border-[#c6c5d2] rounded-xl flex-col shadow-xs">
            <div className="px-6 py-4 border-b border-[#c6c5d2] flex justify-between items-center bg-[#f7f9fb]">
              <h5 className="font-headline font-bold text-base text-[#ba1a1a] flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-[#ba1a1a]" />
                도면 검토 분석 리포트
              </h5>
              <span className="font-mono text-xs px-3 py-1 bg-red-100 text-red-800 rounded-full font-bold">
                {selectedItem.status}
              </span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-5 custom-scrollbar">
              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  OCR 추출 표제란 & 기본 스펙
                </h6>
                <div className="grid grid-cols-2 gap-3 bg-[#f2f4f6] p-4 rounded-lg border border-[#c6c5d2] text-xs font-mono">
                  <div>
                    <span className="text-[#767682] block">도면명:</span>
                    <span className="font-bold text-[#000d5f]">
                      {selectedItem.drawingTitle || selectedItem.fileName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#767682] block">도면번호:</span>
                    <span className="font-bold text-[#191c1e]">
                      {selectedItem.drawingNumber || 'DWG-SCAN'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#767682] block">축척:</span>
                    <span className="font-bold text-[#191c1e]">{selectedItem.scale || '1 : 100'}</span>
                  </div>
                  <div>
                    <span className="text-[#767682] block">검토일시:</span>
                    <span className="font-bold text-[#191c1e]">{selectedItem.updatedAt}</span>
                  </div>
                </div>
              </section>

              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  AI 분석 결과
                </h6>
                <p className="font-body text-sm leading-relaxed text-[#191c1e] bg-[#f2f4f6] p-4 rounded-lg border-l-4 border-[#000d5f]">
                  <span className="block line-clamp-3">{compact(selectedItem.description, 220)}</span>
                </p>
              </section>
              {selectedItem.reviewNarrative && (
                <section>
                  <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">전문 설계 검토의견</h6>
                  <div className="space-y-4 rounded-lg border border-blue-200 bg-slate-50 p-4 text-sm text-[#191c1e]">
                    {selectedItem.reviewNarrative.drawingOverview && <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><span className="text-[11px] font-bold text-blue-700">도면 개요</span><p className="mt-1 leading-6">{compact(selectedItem.reviewNarrative.drawingOverview, 220)}</p></div>}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between"><b className="text-sm text-slate-900">핵심 검토 항목</b><span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-800">{selectedItem.reviewNarrative.checklistReview?.length || 0}건</span></div>
                      {selectedItem.reviewNarrative.checklistReview?.map((item) => <div key={`${item.number}-${item.topic}`} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><b className="text-sm leading-5 text-slate-900">{item.number}. {compact(item.topic, 100)}</b><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${item.status === 'FAIL' ? 'bg-red-100 text-red-700' : item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.status === 'FAIL' ? '보완 필요' : item.status === 'PASS' ? '적합' : '확인 필요'}</span></div><dl className="mt-3 grid gap-2 text-xs leading-5"><div><dt className="font-bold text-slate-500">확인 내용</dt><dd className="text-slate-700">{compact(item.observation)}</dd></div><div><dt className="font-bold text-slate-500">적용 기준·근거</dt><dd className="text-slate-700">{compact(item.criteria, 120)} · {compact(item.legalBasis, 120)}</dd></div><div className="rounded bg-blue-50 p-2"><dt className="font-bold text-blue-700">권고 조치</dt><dd className="text-blue-900">{compact(item.recommendation)}</dd></div></dl></div>)}
                    </div>
                    {[['시공 전 확인사항', selectedItem.reviewNarrative.preConstructionChecks, 'blue'], ['시공 후 확인사항', selectedItem.reviewNarrative.postConstructionChecks, 'violet'], ['타분야·역무범위 확인', selectedItem.reviewNarrative.interfaceAndScopeChecks, 'amber']].map(([label, items, tone]) => Array.isArray(items) && items.length ? <div key={label as string}><div className="mb-2 flex items-center justify-between"><b className="text-sm text-slate-900">{label as string}</b><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${tone === 'amber' ? 'bg-amber-100 text-amber-800' : tone === 'violet' ? 'bg-violet-100 text-violet-800' : 'bg-blue-100 text-blue-800'}`}>{items.length}건</span></div><div className="grid gap-2">{items.map((item: string, index: number) => <div key={`${label}-${index}`} className="rounded border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-700"><span className="mr-2 font-bold text-slate-400">{index + 1}</span>{item}</div>)}</div></div> : null)}
                    {selectedItem.reviewNarrative.overallOpinion && <div className="rounded-lg border-l-4 border-indigo-600 bg-indigo-50 p-3"><span className="text-[11px] font-bold text-indigo-700">종합 판단</span><p className="mt-1 leading-6 text-indigo-950">{selectedItem.reviewNarrative.overallOpinion}</p></div>}
                  </div>
                </section>
              )}

              <section>
                <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">
                  검토 상태 변경
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
                  엔지니어 검토 의견
                </h6>
                <textarea
                  value={engineerNotes}
                  onChange={(e) => setEngineerNotes(e.target.value)}
                  placeholder="도면 검토 보정안 또는 조치 메모 입력..."
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
                onClick={handleSaveNotes}
                className="px-5 py-2 bg-[#000d5f] text-white rounded-lg font-mono text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                검토의견 저장
              </button>
            </div>
          </div>
        </div>
      )}
      {isReportOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsReportOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 pb-4"><div><h2 className="text-xl font-bold text-[#000d5f]">도면 검토 종합 보고서</h2><p className="mt-1 text-xs text-slate-500">{selectedItem.fileName} · {selectedItem.updatedAt}</p></div><button onClick={() => setIsReportOpen(false)} className="text-xl">×</button></div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded bg-red-50 p-3"><b className="block text-xl text-red-700">{(selectedItem.markups || []).filter((m) => m.severity === 'CRITICAL').length}</b>설계 오류</div><div className="rounded bg-amber-50 p-3"><b className="block text-xl text-amber-700">{(selectedItem.markups || []).filter((m) => /안전|법규/i.test(`${m.category} ${m.title}`)).length}</b>안전 검토</div><div className="rounded bg-emerald-50 p-3"><b className="block text-xl text-emerald-700">{(selectedItem.markups || []).filter((m) => /원가|VE|절감/i.test(`${m.category} ${m.title}`)).length}</b>원가절감</div></div>
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-7">{selectedItem.result || 'AI 검토 결과가 아직 없습니다.'}</p>
            {selectedItem.rawOcrText && <div className="mt-3 rounded-lg border border-slate-200 p-4 text-xs leading-6"><b>도면에서 추출된 근거</b><p className="mt-2 whitespace-pre-wrap text-slate-600">{selectedItem.rawOcrText}</p></div>}
            <div className="mt-4 space-y-3">{(selectedItem.markups || []).map((markup, index) => <div key={markup.id || index} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between"><b>{markup.title}</b><span className="text-xs font-bold">{markup.severity}</span></div><p className="mt-1 text-sm text-slate-600">{markup.comment}</p>{markup.codeClause && <p className="mt-1 text-xs text-slate-500">근거: {markup.codeClause}</p>}</div>)}</div>
            <div className="mt-5 border-t border-slate-200 pt-4 text-right"><button onClick={() => window.print()} className="rounded bg-[#000d5f] px-4 py-2 text-xs font-bold text-white">보고서 인쇄 / PDF 저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
