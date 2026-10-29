import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { FileText, ZoomIn, ZoomOut, RotateCcw, MapPin, ScanText, X } from 'lucide-react';
import { normalizeFinding, severityColor } from '../lib/reviewClassification';
import { hasCoordinates } from '../lib/reviewNormalization';
import type { DocCategory, TradeCategory, ReviewMarkup, OcrBlock } from '../types';

interface DrawingCanvasPreviewProps {
  previewPages?: string[]; fileDataUrl?: string; cadUrl?: string;
  drawingTitle?: string; drawingNumber?: string; scale?: string; fileName?: string;
  docCategory?: DocCategory; tradeCategory?: TradeCategory;
  ocrBlocks?: OcrBlock[]; selectedOcrBlockId?: string | null; onOcrBlockSelect?: (id: string) => void;
  markups?: ReviewMarkup[]; selectedMarkupId?: string; onMarkupSelect?: (id: string) => void;
  placementMode?: boolean;
  onPlaceMarkup?: (position: { xPercent: number; yPercent: number; pageNumber: number }) => void;
  highlightError?: { errorCode?: string; description?: string }; className?: string; maxHeight?: string;
}
export const DrawingCanvasPreview: React.FC<DrawingCanvasPreviewProps> = ({
  previewPages = [], fileDataUrl, cadUrl, fileName, drawingTitle, drawingNumber,
  ocrBlocks = [], selectedOcrBlockId, onOcrBlockSelect, markups = [], selectedMarkupId, onMarkupSelect, className = '', placementMode = false, onPlaceMarkup,
}) => {
  const rawUrl = fileDataUrl || cadUrl;
  const isPdf = !!rawUrl && (/^data:application\/pdf/i.test(rawUrl) || /\.pdf(?:$|[?#])/i.test(rawUrl) || /\.pdf$/i.test(fileName || ''));
  const [currentPage, setCurrentPage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [activeId, setActiveId] = useState('');
  const [showMarkups, setShowMarkups] = useState(true);
  const [showOcr, setShowOcr] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1, height: 1 });
  const [stageSize, setStageSize] = useState({ width: 600, height: 420 });
  const [pdf, setPdf] = useState<any>(null);
  const [pdfImage, setPdfImage] = useState('');
  const [pdfError, setPdfError] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pageCount = previewPages.length || pdf?.numPages || 1;
  const pageIndex = Math.min(currentPage, pageCount - 1);
  const imageUrl = previewPages[pageIndex] || (isPdf ? pdfImage : rawUrl);
  const chosenId = selectedMarkupId ?? activeId;
  useEffect(() => {
    setCurrentPage(0); setZoom(1); setPan({ x: 0, y: 0 }); setActiveId(''); setImageError(false);
  }, [rawUrl, fileName]);
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stageRef.current); return () => observer.disconnect();
  }, []);
  // Render older saved PDFs without preview assets using the same light canvas.
  useEffect(() => {
    setPdf(null); setPdfImage(''); setPdfError('');
    if (!isPdf || previewPages.length || !rawUrl) return;
    let cancelled = false; let task: any;
    (async () => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();
      if (cancelled) return;
      const input = rawUrl.startsWith('data:')
        ? { data: Uint8Array.from(atob(rawUrl.split(',')[1]), char => char.charCodeAt(0)) }
        : { url: rawUrl };
      task = pdfjs.getDocument(input);
      const document = await task.promise;
      if (!cancelled) setPdf(document);
    })().catch(() => { if (!cancelled) setPdfError('PDF를 열 수 없습니다. 암호 또는 DRM 보호 여부를 확인하세요.'); });
    return () => { cancelled = true; if (task) void task.destroy().catch(() => {}); };
  }, [rawUrl, isPdf, previewPages.length]);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false; let render: any;
    setPdfImage('');
    (async () => {
      const page = await pdf.getPage(pageIndex + 1);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      render = page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport });
      await render.promise;
      if (!cancelled) { setPdfError(''); setPdfImage(canvas.toDataURL('image/png')); }
    })().catch(() => { if (!cancelled) setPdfError('이 페이지를 표시할 수 없습니다.'); });
    return () => { cancelled = true; render?.cancel(); };
  }, [pdf, pageIndex]);
  useEffect(() => {
    if (!selectedMarkupId) return;
    const selected = markups.find(markup => markup.id === selectedMarkupId);
    if (selected?.pageNumber) {
      setCurrentPage(Math.max(0, Math.min(pageCount - 1, selected.pageNumber - 1))); setPan({ x: 0, y: 0 });
    }
  }, [selectedMarkupId, markups, pageCount]);
  useEffect(() => { setImageError(false); }, [imageUrl]);
  const selectMarkup = (id: string) => { setActiveId(id); onMarkupSelect?.(id); };
  const pageMarkups = markups.map((item: ReviewMarkup, index: number) => ({ ...normalizeFinding(item), displayIndex: item.displayIndex || index + 1 }))
    .filter(item => hasCoordinates(item) && (item.pageNumber || 1) === pageIndex + 1);
  const selected = showMarkups ? pageMarkups.find(item => item.id === chosenId) : undefined;
  const color = (item: ReviewMarkup) => severityColor(item.severity);
  const fit = Math.max(.01, Math.min(Math.max(1, stageSize.width - 72) / dimensions.width, Math.max(1, stageSize.height - 64) / dimensions.height));
  const changePage = (page: number) => { setCurrentPage(page); selectMarkup(''); setPan({ x: 0, y: 0 }); };
  const changeZoom = (delta: number) => setZoom(value => Math.max(.5, Math.min(4, value + delta)));
  const validOcr = ocrBlocks.filter(block => {
    const b = block.bbox;
    return b && [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0 && b.x + b.width <= 100 && b.y + b.height <= 100;
  });
  const toolClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-35';
  return <div data-testid="drawing-preview" className={'flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 ' + className}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <span className="flex items-center gap-2 text-xs font-semibold"><FileText className="h-4 w-4 text-blue-700" />{isPdf ? 'PDF 도면' : '도면 미리보기'}</span>
      <div className="flex flex-wrap items-center gap-1">
        <button className={toolClass} aria-label="축소" onClick={() => changeZoom(-.25)}><ZoomOut className="h-4 w-4" /></button>
        <span className="w-11 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
        <button className={toolClass} aria-label="확대" onClick={() => changeZoom(.25)}><ZoomIn className="h-4 w-4" /></button>
        <button className={toolClass} aria-label="화면 맞춤" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw className="h-3.5 w-3.5" /></button>
        <button className={toolClass} aria-label="주석 표시" aria-pressed={showMarkups} onClick={() => setShowMarkups(value => !value)}><MapPin className={'h-4 w-4 ' + (showMarkups ? 'text-blue-600' : '')} /></button>
        {!!validOcr.length && !isPdf && <button className={toolClass} aria-label="OCR 영역 표시" aria-pressed={showOcr} onClick={() => setShowOcr(value => !value)}><ScanText className="h-4 w-4" /></button>}
        {isPdf && <><button className={toolClass} disabled={pageIndex === 0} onClick={() => changePage(pageIndex - 1)}>이전</button><span data-testid="drawing-page" className="px-1 text-xs tabular-nums">{pageIndex + 1} / {pageCount}</span><button className={toolClass} disabled={pageIndex >= pageCount - 1} onClick={() => changePage(pageIndex + 1)}>다음</button></>}
      </div>
    </div>
    <div ref={stageRef} data-testid="drawing-stage" className="relative min-h-[320px] flex-1 overflow-hidden bg-[#edf2f7]" style={{ touchAction: 'none' }}
      onWheel={event => { if (event.ctrlKey) { event.preventDefault(); changeZoom(event.deltaY > 0 ? -.1 : .1); } }}
      onPointerDown={event => {
        if (placementMode || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
        event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, left: pan.x, top: pan.y };
      }}
      onPointerMove={event => { if (drag.current) setPan({ x: drag.current.left + event.clientX - drag.current.x, y: drag.current.top + event.clientY - drag.current.y }); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      {imageUrl && !imageError ? <div className={'absolute left-1/2 top-1/2 bg-white shadow-lg ' + (placementMode ? 'cursor-crosshair' : '')} data-testid="drawing-sheet"
        onClick={event => {
          if (!placementMode || (event.target as HTMLElement).closest('button')) return;
          const rect = event.currentTarget.getBoundingClientRect();
          onPlaceMarkup?.({ xPercent: Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100)), yPercent: Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100)), pageNumber: pageIndex + 1 });
        }}
        style={{ width: dimensions.width * fit, height: dimensions.height * fit, transform: 'translate(-50%, -50%) translate(' + pan.x + 'px, ' + pan.y + 'px) scale(' + zoom + ')' }}>
        <img src={imageUrl} alt={(fileName || '도면') + ' ' + (pageIndex + 1) + '페이지'} draggable={false} className="block h-full w-full"
          onLoad={event => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} onError={() => setImageError(true)} />
        {showOcr && !isPdf && validOcr.map((block, index) => <button key={block.id || index} aria-label={'OCR 영역: ' + block.text}
          className={'absolute border-2 ' + (selectedOcrBlockId === block.id ? 'border-amber-500 bg-amber-200/20' : 'border-teal-500 bg-teal-100/20')}
          style={{ left: block.bbox!.x + '%', top: block.bbox!.y + '%', width: block.bbox!.width + '%', height: block.bbox!.height + '%' }} onClick={() => onOcrBlockSelect?.(block.id || 'ocr-' + index)} />)}
        {showMarkups && pageMarkups.map(item => <button key={item.id} data-testid="drawing-marker" aria-label={'주석 ' + item.displayIndex + ': ' + item.title}
          className={'absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md ' + (chosenId === item.id ? 'ring-4 ring-blue-200' : '')}
          style={{ left: item.xPercent + '%', top: item.yPercent + '%', backgroundColor: color(item) }} onClick={() => selectMarkup(item.id)}>{item.displayIndex}</button>)}
        {selected && !placementMode && <><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
          <line x1={selected.xPercent} y1={selected.yPercent} x2={selected.xPercent! < 50 ? 65 : 35} y2={selected.yPercent! < 50 ? 65 : 25} stroke={color(selected)} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 3" />
        </svg><div data-testid="drawing-callout" className="absolute z-30 w-56 -translate-x-1/2 rounded-lg border bg-white p-3 text-xs text-slate-700 shadow-xl"
          style={{ left: selected.xPercent! < 50 ? '65%' : '35%', top: selected.yPercent! < 50 ? '65%' : '25%', borderColor: color(selected) }}>
          <button aria-label="주석 닫기" onClick={() => selectMarkup('')} className="float-right ml-2 text-slate-400"><X className="h-4 w-4" /></button>
          <b className="block text-slate-900">{selected.displayIndex}. {selected.title}</b><p className="mt-2">{selected.comment}</p>
          {selected.codeClause && <span className="mt-2 block border-t border-slate-100 pt-2 text-blue-700">{selected.codeClause}</span>}
        </div></>}
      </div> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-slate-500"><FileText className="h-9 w-9 text-slate-400" />{pdfError || (imageError ? '도면 이미지를 불러올 수 없습니다.' : isPdf ? 'PDF 페이지를 불러오는 중입니다.' : '표시할 도면이 없습니다.')}</div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
      <span className="max-w-[60%] truncate">{drawingTitle || fileName}{drawingNumber ? ' · ' + drawingNumber : ''}</span><span>드래그 이동 · Ctrl + 휠 확대</span>
    </div>
  </div>;
};
