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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-[580px]">
          {/* Left: Original CAD / Image Document View */}
          <div className="bg-white border border-[#c6c5d2] rounded-xl flex flex-col overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f2f4f6] flex justify-between items-center">
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

            <div className="flex-1 bg-[#1A1A1A] relative flex items-center justify-center p-3 overflow-hidden min-h-[400px]">
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

          {/* Right: OCR Review Findings & Editor Panel */}
          <div className="bg-white border border-[#c6c5d2] rounded-xl flex flex-col shadow-xs">
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
                  {selectedItem.description}
                </p>
              </section>
              {selectedItem.reviewNarrative && (
                <section>
                  <h6 className="font-mono text-xs text-[#454651] uppercase tracking-wider mb-2 font-semibold">전문 설계 검토의견</h6>
                  <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm leading-6 text-[#191c1e]">
                    {selectedItem.reviewNarrative.drawingOverview && <p className="font-semibold">{selectedItem.reviewNarrative.drawingOverview}</p>}
                    {selectedItem.reviewNarrative.checklistReview?.map((item) => <div key={`${item.number}-${item.topic}`} className="rounded border border-slate-200 bg-white p-3"><b>{item.number}. {item.topic}</b><p className="mt-1">{item.observation}</p><p className="mt-1 text-xs text-slate-600">기준: {item.criteria} · 상태: {item.status} · 근거: {item.legalBasis}</p><p className="mt-1 text-xs font-semibold text-blue-800">권고: {item.recommendation}</p></div>)}
                    {selectedItem.reviewNarrative.preConstructionChecks?.map((item, index) => <p key={`pre-${index}`}><b>시공 전 확인 {index + 1}.</b> {item}</p>)}
                    {selectedItem.reviewNarrative.postConstructionChecks?.map((item, index) => <p key={`post-${index}`}><b>시공 후 확인 {index + 1}.</b> {item}</p>)}
                    {selectedItem.reviewNarrative.interfaceAndScopeChecks?.map((item, index) => <p key={`scope-${index}`}><b>타분야·역무범위 {index + 1}.</b> {item}</p>)}
                    {selectedItem.reviewNarrative.overallOpinion && <p className="border-t border-blue-200 pt-3 font-bold">종합 검토의견: {selectedItem.reviewNarrative.overallOpinion}</p>}
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
