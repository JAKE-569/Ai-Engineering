import React, { useMemo, useState } from 'react';
import { X, Search, FileText, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DesignErrorItem, ReviewItem, UploadFile } from '../types';
import { DrawingCanvasPreview } from './DrawingCanvasPreview';

interface Props { errorItem: DesignErrorItem | null; uploadFiles: UploadFile[]; reviewItems: ReviewItem[]; onClose: () => void; }

export const ReviewWorkspaceModal: React.FC<Props> = ({ errorItem, uploadFiles, reviewItems, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(errorItem?.dwgFile || '');
  const selectedUpload = uploadFiles.find((file) => file.name === selectedId) || uploadFiles[0];
  const selectedReview = reviewItems.find((item) => item.fileName === selectedId) || reviewItems.find((item) => item.fileName === errorItem?.dwgFile);
  const source = selectedUpload || selectedReview;
  const markups = selectedReview?.markups || errorItem?.markups || [];
  const activeMarkup = markups[0];
  const documents = useMemo(() => uploadFiles.filter((file) => file.name.toLowerCase().includes(query.toLowerCase())), [uploadFiles, query]);
  if (!errorItem) return null;

  return <div className="fixed inset-0 z-[120] bg-slate-950/80 p-3 md:p-6">
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-5">
        <div><h2 className="text-base font-bold text-slate-900">도면 검토 워크스페이스</h2><p className="text-xs text-slate-500">{source?.name || errorItem.dwgFile} · 실제 업로드 원본</p></div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      </header>
      <div className="grid min-h-0 flex-1 grid-cols-[250px_minmax(0,1fr)_360px]">
        <aside className="min-h-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-slate-800">도면 목록</h3><span className="text-xs text-slate-500">{documents.length}건</span></div>
          <div className="relative mb-4"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="도면 검색" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-blue-500" /></div>
          <div className="space-y-2">{documents.map((file) => <button key={file.id} onClick={() => setSelectedId(file.name)} className={`w-full rounded-lg border p-3 text-left ${selectedId === file.name ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}><div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /><span className="min-w-0"><b className="block truncate text-xs text-slate-800">{file.name}</b><span className="mt-1 block text-[10px] text-slate-500">{file.previewPages?.length || 1} 페이지 · {file.status}</span></span></div></button>)}</div>
        </aside>
        <main className="min-h-0 bg-slate-200 p-4"><div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-300 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><b className="text-sm text-slate-800">{source?.drawingTitle || source?.name || errorItem.dwgFile}</b><span className="ml-2 text-xs text-slate-500">{source?.drawingNumber || errorItem.errorCode}</span></div><span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-800">AI 주석 {markups.length}건</span></div><div className="min-h-0 flex-1 p-3"><DrawingCanvasPreview fileDataUrl={source?.fileDataUrl || errorItem.fileDataUrl} cadUrl={source && 'cadUrl' in source ? source.cadUrl : errorItem.cadUrl} previewPages={source?.previewPages || errorItem.previewPages} fileName={source?.name || errorItem.dwgFile} drawingTitle={source?.drawingTitle || errorItem.drawingTitle} drawingNumber={source?.drawingNumber || errorItem.errorCode} markups={markups} ocrBlocks={source?.ocrBlocks || errorItem.ocrBlocks} className="h-full w-full" /></div></div></main>
        <aside className="min-h-0 overflow-y-auto border-l border-slate-200 bg-white p-5"><div className="border-b border-slate-200 pb-4"><div className="mb-2 flex gap-2"><span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-bold text-red-700">심각도: {activeMarkup?.severity || errorItem.severity}</span><span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-bold text-emerald-700">AI 검토</span></div><h3 className="text-lg font-bold leading-snug text-slate-900">{activeMarkup?.title || errorItem.description}</h3><p className="mt-2 text-xs text-slate-500">{source?.name || errorItem.dwgFile}</p></div><section className="mt-5"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">검토 근거 (LOGIC)</h4><div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{activeMarkup?.codeClause || errorItem.suggestedFix || selectedReview?.description || '실제 도면에서 확인된 근거가 없습니다.'}</div></section><section className="mt-5"><h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">증거 데이터 (EVIDENCE)</h4><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-red-200 bg-red-50 p-3"><span className="text-[10px] text-red-600">검토 의견</span><b className="mt-1 block text-sm text-red-800">{activeMarkup?.comment || errorItem.description}</b></div><div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><span className="text-[10px] text-slate-500">OCR 블록</span><b className="mt-1 block text-sm text-slate-800">{source?.ocrBlocks?.length || 0}건</b></div></div><div className="mt-3 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">{source?.rawOcrText || errorItem.rawOcrText || '추출된 OCR 증거 데이터가 없습니다.'}</div></section><section className="mt-5 border-t border-slate-200 pt-4"><div className="flex items-center gap-2 text-xs text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> 실제 업로드 도면 기반 검토</div><div className="mt-2 flex items-center gap-2 text-xs text-slate-600"><ShieldAlert className="h-4 w-4 text-amber-600" /> 추가 확인 필요 항목은 주석을 선택하세요</div></section></aside>
      </div>
    </div>
  </div>;
};
