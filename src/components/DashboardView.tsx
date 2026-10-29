import { severityLabel, classifyFinding } from '../lib/reviewClassification';
import React, { useEffect, useState } from 'react';
import { ReviewItem, PageTab, UploadFile, VeItem } from '../types';
import { veAdoptionSummary, largeVeAmount } from '../lib/veAdoption';
import { won } from '../lib/veCost';
import { dashboardSummary } from '../lib/dashboardSummary';
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
  veItems?: VeItem[];
  reviewItems: ReviewItem[];
  uploadFiles?: UploadFile[];
  onSelectTab: (tab: PageTab) => void;
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  onOpenOcrModal?: (file: ReviewItem) => void;
  onUpdateReviewItem: (updated: ReviewItem) => Promise<boolean>;
  searchQuery: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reviewItems,
  veItems = [],
  uploadFiles = [],
  onSelectTab,
  onOpenCadViewer,
  onOpenOcrModal,
  onUpdateReviewItem,
  searchQuery,
}) => {
  const veSummary = veAdoptionSummary(veItems);
  const veAmount = largeVeAmount(veSummary.savings);
  const compact = (value?: string, max = 180) => {
    const text = (value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    const sentence = text.slice(0, max).replace(/[,;|].*$/, '').trim();
    return `${sentence || text.slice(0, max).trim()}…`;
  };
  const [selectedItemId, setSelectedItemId] = useState<string>(reviewItems[0]?.id || '');
  const selectedItem = reviewItems.find((item) => item.id === selectedItemId) || reviewItems[0];
  const selectedSource = selectedItem ? uploadFiles.find((file) => file.documentId === selectedItem.documentId) : undefined;
  const drawingDataUrl = selectedItem?.fileDataUrl || selectedItem?.cadUrl || selectedSource?.fileDataUrl;
  const checklistItems = (selectedItem?.reviewNarrative?.checklistReview || []).map((item) => {
    const category = String((item as any).category || '');
    const isSafety = category.includes('안전') || category.includes('법규') || category.includes('소방') || /피난|방화|화재|소화|비상|안전/.test(`${item.topic} ${item.observation}`);
    return { ...item, displayCategory: isSafety ? '안전' : '설계' };
  });

  const normalizedChecklist = (() => {
    const existing = checklistItems.filter((item) => String(item.topic || item.observation || '').trim());
    const hadBlank = (selectedItem?.reviewNarrative?.checklistReview || []).some((item) => !String(item.topic || item.observation || '').trim());
    if (existing.length && !hadBlank) return existing;
    return (selectedItem?.markups || []).filter((markup) => String(markup.title || markup.comment || '').trim()).map((markup, index) => ({
      number: index + 1,
      category: /안전|법규|소방|피난|화재/i.test(`${markup.category} ${markup.title} ${markup.comment}`) ? '안전' : '설계',
      displayCategory: /안전|법규|소방|피난|화재/i.test(`${markup.category} ${markup.title} ${markup.comment}`) ? '안전' : '설계',
      topic: markup.title,
      criteria: markup.codeClause || '관련 법규·기술기준 확인',
      observation: markup.comment,
      status: markup.findingStatus || 'NEEDS_CONFIRMATION',
      evidence: markup.evidence || markup.comment,
      legalBasis: markup.codeClause || '관련 법규 조항 확인 필요',
      recommendation: markup.correctiveAction || '도면 및 계산서의 근거를 확인하세요.',
    }));
  })();


  const [engineerNotes, setEngineerNotes] = useState<string>(selectedItem?.engineerNotes || '');
  const [currentStatus, setCurrentStatus] = useState<string>(selectedItem?.status || '오류 의심');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  useEffect(() => { setEngineerNotes(selectedItem?.engineerNotes || ''); setCurrentStatus(selectedItem?.status || '주의'); setIsSaved(false); }, [selectedItem?.id]);

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

  const handleSaveNotes = async () => {
    if (!selectedItem) return;
    const updated = {
      ...selectedItem,
      engineerNotes,
      status: currentStatus as ReviewItem['status'],
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    const saved = await onUpdateReviewItem(updated);
    setIsSaved(Boolean(saved));
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Safety & Law */}
        <div
          onClick={() => onSelectTab('safety')}
          className="dashboard-overview-card bg-blue-50 border border-blue-200 p-5 rounded-xl hover:border-blue-500 transition-all cursor-pointer shadow-xs group"
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
            <div className="relative bg-red-50 p-3 rounded-lg border border-red-100">
              <p className="text-[10px] text-[#ba1a1a] font-bold font-mono">오류 의심</p>
              <p className="absolute bottom-3 right-3 text-2xl font-bold font-headline text-[#93000a]">{errorCount}</p>
            </div>
            <div className="relative bg-amber-50 p-3 rounded-lg border border-amber-100">
              <p className="text-[10px] text-amber-600 font-bold font-mono">주의</p>
              <p className="absolute bottom-3 right-3 text-2xl font-bold font-headline text-amber-700">{warningCount}</p>
            </div>
            <div className="relative bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold font-mono">정상</p>
              <p className="absolute bottom-3 right-3 text-2xl font-bold font-headline text-emerald-700">{normalCount}</p>
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
          className="dashboard-overview-card bg-red-50 border border-red-200 p-5 rounded-xl hover:border-red-500 transition-all cursor-pointer shadow-xs group"
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
        <div data-testid="dashboard-ve-summary" onClick={() => onSelectTab('cost_ve')} className="dashboard-overview-card bg-emerald-50 border border-emerald-200 p-5 rounded-xl hover:border-emerald-500 transition-colors cursor-pointer shadow-xs">
          <h3 className="font-headline font-bold text-base text-[#000d5f] flex items-center gap-2"><span className="dashboard-card-icon dashboard-card-icon--cost material-symbols-outlined text-xl">payments</span>공사비 및 VE 분석</h3>
          <p className="mt-4 text-xs font-bold text-emerald-900">채택 VE 예상 절감액</p>
          <p data-testid="dashboard-ve-savings" className="ve-savings-number mt-2 text-emerald-800">{veAmount.value}<span className="ve-savings-unit">{veAmount.unit}</span></p>
          <div className="mt-4 space-y-2 border-t border-emerald-200 pt-3 text-sm"><p className="flex justify-between gap-2"><span>변경 전 공사비</span><b>{won(veSummary.before)}</b></p><p className="flex justify-between gap-2"><span>변경 후 공사비</span><b>{won(veSummary.after)}</b></p></div>
          <p className="mt-3 text-xs text-slate-600">채택 {veSummary.adopted.length} / {veItems.length}건 · LLM 가정 산출치 {veSummary.assumedCount}건 포함</p>
          <p className="mt-2 text-xs font-bold text-blue-900">원가 및 VE에서 후보 확인·채택 →</p>
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
                    <td className="px-6 py-4 font-body text-sm text-[#191c1e]"><div data-testid="dashboard-ocr-summary" className="w-full min-w-[220px] max-w-md leading-6">{dashboardSummary(item).map((line, index) => <p key={index} className="truncate">{line}</p>)}</div></td>
                    <td className="px-6 py-4 font-body text-xs text-[#454651]">{item.updatedAt}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(item);
                          onOpenCadViewer(item.documentId || item.fileName, 'ERR-STR-021');
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
                  onClick={() => onOpenCadViewer(selectedItem.documentId || selectedItem.fileName, 'ERR-STR-021')}
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
                {selectedItem.reviewNarrative.overallOpinion && <div className={`rounded-lg border p-3 ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'border-red-200 bg-red-50' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}><div className="flex items-center justify-between"><b className={`text-xs ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'text-red-700' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'text-amber-700' : 'text-blue-700'}`}>종합 판단</b><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? 'bg-red-100 text-red-700' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{(selectedItem.markups || []).some((m) => m.severity === 'CRITICAL') ? '심각' : (selectedItem.markups || []).some((m) => m.severity === 'WARNING') ? '주의' : '적절'}</span></div><p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-800">{compact(selectedItem.reviewNarrative.overallOpinion, 180)}</p></div>}
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
          <aside className="dashboard-core-panel flex max-h-[680px] min-h-0 w-[360px] flex-col overflow-hidden rounded-xl border border-slate-300 bg-white p-5 shadow-sm">
            <button type="button" onClick={() => onOpenCadViewer(selectedItem.documentId || selectedItem.fileName, 'ERR-STR-021')} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#000d5f] px-4 py-4 text-base font-bold text-white shadow-md transition hover:bg-blue-900"><span className="material-symbols-outlined">visibility</span>도면 워크스페이스</button>
            <div className="mb-4 border-b border-slate-200 pb-3"><h5 className="text-base font-bold text-slate-900">핵심 검토 항목</h5><p className="mt-1 text-xs text-slate-500">도면 프레임과 분리된 검토 목록</p></div>
            <div className="space-y-3">
              {(selectedItem.reviewNarrative?.checklistReview || []).map((item) => <div key={`${item.number}-${item.topic}`} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><b className="text-xs leading-5 text-slate-900">{item.number}. {compact(item.topic, 110)}</b><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${classifyFinding({ ...item, title: item.topic, description: item.observation }).severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : classifyFinding({ ...item, title: item.topic, description: item.observation }).severity === 'INFO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{severityLabel(classifyFinding({ ...item, title: item.topic, description: item.observation }).severity)}</span></div><p className="mt-2 text-xs leading-5 text-slate-600">{compact(item.observation, 180)}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">근거: {compact(item.legalBasis, 100)}</p></div>)}
              {!(selectedItem.reviewNarrative?.checklistReview?.length) && <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-500">검토 항목이 없습니다.</div>}
            </div>
          </aside>

          <section className="col-span-full rounded-xl border border-slate-300 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold">엔지니어 검토 의견</h3>
            <label className="mb-3 block text-xs">검토 판정
              <select aria-label="검토 판정" value={currentStatus} onChange={event => setCurrentStatus(event.target.value)} className="ml-3 rounded border p-2">
                {['주의', '오류 의심', '정상', '미검토', '검토대기', '검토중', '긴급 확인'].map(value => <option key={value}>{value}</option>)}
              </select>
            </label>
            <textarea aria-label="엔지니어 검토 메모" value={engineerNotes} onChange={event => { setEngineerNotes(event.target.value); setIsSaved(false); }} placeholder="도면 검토 보정안 또는 조치 메모 입력..." className="h-28 w-full rounded border border-slate-300 p-3 text-sm" />
            <div className="mt-3 flex items-center justify-end gap-3">
              {isSaved && <span className="text-sm text-emerald-700">저장되었습니다!</span>}
              <button onClick={handleSaveNotes} className="rounded bg-[#000d5f] px-4 py-2 text-sm font-bold text-white">검토의견 저장</button>
            </div>
          </section>
        </div>
      )}
      {isReportOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setIsReportOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 pb-4"><div><h2 className="text-xl font-bold text-[#000d5f]">도면 검토 종합 보고서</h2><p className="mt-1 text-xs text-slate-500">{selectedItem.fileName} · {selectedItem.updatedAt}</p></div><button onClick={() => setIsReportOpen(false)} className="text-xl">×</button></div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded bg-red-50 p-3"><b className="block text-xl text-red-700">{(selectedItem.markups || []).filter((m) => m.severity === 'CRITICAL').length}</b>설계 오류</div><div className="rounded bg-amber-50 p-3"><b className="block text-xl text-amber-700">{(selectedItem.markups || []).filter((m) => /안전|법규/i.test(`${m.category} ${m.title}`)).length}</b>안전 검토</div><div className="rounded bg-emerald-50 p-3"><b className="block text-xl text-emerald-700">{(selectedItem.markups || []).filter((m) => /원가|VE|절감/i.test(`${m.category} ${m.title}`)).length}</b>원가절감</div></div>
            <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-7">{selectedItem.result || 'AI 검토 결과가 아직 없습니다.'}</p>
            {selectedItem.rawOcrText && <div className="mt-3 rounded-lg border border-slate-200 p-4 text-xs leading-6"><b>도면에서 추출된 근거</b><p className="mt-2 whitespace-pre-wrap text-slate-600">{selectedItem.rawOcrText}</p></div>}
            <div className="mt-4 space-y-3">{(selectedItem.markups || []).map((markup, index) => <div key={markup.id || index} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between"><b>{markup.title}</b><span className="text-xs font-bold">{severityLabel(markup.severity)}</span></div><p className="mt-1 text-sm text-slate-600">{markup.comment}</p>{markup.codeClause && <p className="mt-1 text-xs text-slate-500">근거: {markup.codeClause}</p>}</div>)}</div>
            <div className="mt-5 border-t border-slate-200 pt-4 text-right"><button onClick={() => window.print()} className="rounded bg-[#000d5f] px-4 py-2 text-xs font-bold text-white">보고서 인쇄 / PDF 저장</button></div>
          </div>
        </div>
      )}
    </div>
  );
};
