import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Flame,
  ShieldAlert,
  Sliders,
  ScanText,
  AlertTriangle,
  FileCheck,
  Maximize2,
  MapPin,
  MessageSquareCode,
  Wrench,
  BookOpen,
} from 'lucide-react';
import { DocCategory, TradeCategory, ReviewMarkup } from '../types';

interface DrawingCanvasPreviewProps {
  previewPages?: string[];
  fileDataUrl?: string;
  cadUrl?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  fileName?: string;
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  ocrBlocks?: {
    id?: string;
    text: string;
    category: string;
    confidence?: number;
    bbox?: { x: number; y: number; width: number; height: number };
  }[];
  selectedOcrBlockId?: string | null;
  onOcrBlockSelect?: (id: string) => void;
  markups?: ReviewMarkup[];
  selectedMarkupId?: string;
  onMarkupSelect?: (id: string) => void;
  highlightError?: { errorCode?: string; description?: string };
  className?: string;
  maxHeight?: string;
}

export const DrawingCanvasPreview: React.FC<DrawingCanvasPreviewProps> = ({
  previewPages = [],
  fileDataUrl,
  cadUrl,
  drawingTitle,
  drawingNumber,
  scale = '1 : 100',
  fileName,
  docCategory = '도면',
  tradeCategory = '소방',
  ocrBlocks = [],
  selectedOcrBlockId = null,
  onOcrBlockSelect,
  markups = [],
  selectedMarkupId,
  onMarkupSelect,
  highlightError,
  className = '',
  maxHeight = '580px',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [showPipingLayer, setShowPipingLayer] = useState<boolean>(true);
  const [showDetectionLayer, setShowDetectionLayer] = useState<boolean>(true);
  const [showRadiusLayer, setShowRadiusLayer] = useState<boolean>(true);
  const [showOcrLayer, setShowOcrLayer] = useState<boolean>(true);
  const [showMarkupLayer, setShowMarkupLayer] = useState<boolean>(true);
  const [activeMarkupId, setActiveMarkupId] = useState<string | null>(selectedMarkupId || null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const rawUrl = fileDataUrl || cadUrl;

  // Check data format
  const displayUrl = previewPages[currentPage] || rawUrl;
  const isPdfData =
    rawUrl &&
    previewPages.length === 0 &&
    (rawUrl.startsWith('data:application/pdf') ||
      rawUrl.toLowerCase().endsWith('.pdf') ||
      rawUrl.includes('type=pdf'));

  const isImageMime =
    rawUrl &&
    (rawUrl.startsWith('data:image/') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://')) &&
    !imageError &&
    !isPdfData;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);
  const handleCtrlWheelZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) return;
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    setZoomLevel((prev) => Math.min(2.5, Math.max(0.5, Number((prev + direction * 0.1).toFixed(2)))));
  };
  const handleResetView = () => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
    setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPan({ x: event.clientX - panStart.x, y: event.clientY - panStart.y });
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsPanning(false);
  };

  const title = drawingTitle || fileName || `${tradeCategory} ${docCategory} 정밀 검토도`;
  const dwgNo = drawingNumber || `DWG-${tradeCategory.substring(0, 2).toUpperCase()}-2024-001`;

  // Only render markups returned by the actual drawing review.
  const effectiveMarkups: ReviewMarkup[] = markups || [];
  const activeId = selectedMarkupId || activeMarkupId;
  const setMarkup = (id: string) => { setActiveMarkupId(id); onMarkupSelect?.(id); };
  const markupTone = (markup: ReviewMarkup) => {
    const category = `${markup.category || ''} ${markup.title || ''} ${markup.comment || ''}`;
    if (/원가|VE|절감|cost/i.test(category)) return 'bg-emerald-600';
    if (/안전|법규|safety/i.test(category)) return 'bg-amber-500';
    return markup.severity === 'CRITICAL' ? 'bg-red-600' : markup.severity === 'WARNING' ? 'bg-orange-500' : 'bg-blue-600';
  };
  if (previewPages.length > 0) {
    return (
      <div className={`relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-lg bg-slate-100 ${className}`}>
        <div className="flex items-center justify-between border-b border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">
          <span className="font-semibold">PDF 원본 · {fileName}</span>
          <div className="flex items-center gap-2"><button type="button" onClick={handleZoomOut} className="rounded border px-2 py-1 font-bold">−</button><span className="min-w-[42px] text-center">{Math.round(zoomLevel * 100)}%</span><button type="button" onClick={handleZoomIn} className="rounded border px-2 py-1 font-bold">+</button><button type="button" onClick={handleResetView} className="rounded border px-2 py-1 text-[10px]">초기화</button><span className="ml-2">{currentPage + 1} / {previewPages.length}</span><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} className="rounded border px-2 py-1 disabled:opacity-40">이전</button><button type="button" disabled={currentPage === previewPages.length - 1} onClick={() => setCurrentPage((p) => Math.min(previewPages.length - 1, p + 1))} className="rounded border px-2 py-1 disabled:opacity-40">다음</button></div>
        </div>
        <div onWheel={handleCtrlWheelZoom} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-200 p-4">
          <div className="relative inline-block max-h-full max-w-full shadow-xl" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}>
            <img src={previewPages[currentPage]} alt={`${fileName} PDF ${currentPage + 1}페이지`} className="block max-h-[520px] max-w-full object-contain" />
            {showMarkupLayer && effectiveMarkups.filter((mk) => !mk.pageNumber || mk.pageNumber === currentPage + 1).map((mk, index) => <button type="button" key={mk.id || index} onClick={() => setMarkup(mk.id)} className={`absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg ${markupTone(mk)} ${activeId === mk.id ? 'ring-4 ring-blue-300' : ''}`} style={{ left: `${mk.xPercent}%`, top: `${mk.yPercent}%` }}>{index + 1}</button>)}
            {activeId && (() => { const selected = effectiveMarkups.find((item) => item.id === activeId); if (!selected) return null; const left = Math.min(78, Math.max(22, selected.xPercent || 50)); const top = selected.yPercent || 50; return <><svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"><line x1={`${selected.xPercent}%`} y1={`${top}%`} x2={`${left}%`} y2={`${Math.max(8, top - 18)}%`} stroke="#2563eb" strokeWidth="2" strokeDasharray="4 3" /></svg><div className="absolute z-30 w-64 -translate-x-1/2 rounded-lg border-2 border-blue-500 bg-white/95 p-3 text-xs shadow-2xl" style={{ left: `${left}%`, top: `${Math.max(4, top - 17)}%` }}><div className="font-bold text-slate-900">{selected.title}</div><p className="mt-1 leading-5 text-slate-600">{selected.comment}</p>{selected.codeClause && <span className="mt-2 inline-block rounded bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-800">{selected.codeClause}</span>}</div></>; })()}
          </div>
        </div>
        {activeMarkupId && <div className="absolute bottom-3 left-3 right-3 z-30 rounded-lg border border-slate-300 bg-white/95 p-3 text-xs shadow-xl"><button type="button" onClick={() => setActiveMarkupId(null)} className="float-right text-slate-400">×</button><strong>{effectiveMarkups.find((m) => m.id === activeMarkupId)?.title}</strong><p className="mt-1 text-slate-600">{effectiveMarkups.find((m) => m.id === activeMarkupId)?.comment}</p></div>}
      </div>
    );
  }
  /* legacy example markups removed
      [
          {
            id: 'm1',
            xPercent: 35,
            yPercent: 40,
            title: `📌 [${tradeCategory} 검토 1] ${title} - 기술기준 주요 지적`,
            comment:
              tradeCategory === '토목'
                ? `[${title}] KDS 11 10 00 / KDS 21 30 00 흙막이 H-Pile 가설 앵커 긴장력 부족 및 사면 토압 검토 필요.`
                : tradeCategory === '건축'
                ? `[${title}] 건축법 시행령 제34조 직통계단 보행거리 제한(30m 이내) 대비 38.5m 초과 지적.`
                : tradeCategory === '건축기계'
                ? `[${title}] KDS 31 25 10 급기 덕트(SA) 풍속 8.5m/s 과다(기준 6.0m/s 이하) 및 소음기 설치 필요.`
                : tradeCategory === '건축전기'
                ? `[${title}] KEC 230 수전반 메인 케이블 허용전류 및 전선관 충전율 40% 초과 지적.`
                : `[${title}] NFTC 102/103 화재안전기술기준 스프링클러 헤드 살수반경(R=2.3m) 미달 지적.`,
            codeClause:
              tradeCategory === '토목'
                ? 'KDS 11 10 00'
                : tradeCategory === '건축'
                ? '건축법 시행령 제34조'
                : tradeCategory === '건축기계'
                ? 'KDS 31 25 10'
                : tradeCategory === '건축전기'
                ? 'KEC 230'
                : 'NFTC 102/103',
            severity: 'CRITICAL',
          },
          {
            id: 'm2',
            xPercent: 68,
            yPercent: 60,
            title: `📌 [${tradeCategory} 검토 2] ${title} - 법규 및 안전성 재검토`,
            comment:
              tradeCategory === '토목'
                ? `[${title}] KDS 44 50 00 우수 배수관 D600 경사(1/150) 미달 및 지중경사계 보정 필요.`
                : tradeCategory === '건축'
                ? `[${title}] 건축법 시행령 제46조 방화구획 내화성능 2시간 방화문 표기 및 준불연 단열재 스펙 재확인.`
                : tradeCategory === '건축기계'
                ? `[${title}] 방화구획 관통부 방화댐퍼(FD) 표기 누락 및 급탕 순환 펌프 양정 수치 보정 필요.`
                : tradeCategory === '건축전기'
                ? `[${title}] 변전실 방폭구역 등급 지정 및 소방 비상전원 연동 조도(300 Lux) 확보 필요.`
                : `[${title}] 소방시설법 자동화재탐지설비 감지기 감응거리 초과 및 비상전원 수신반 연동 확인.`,
            codeClause:
              tradeCategory === '토목'
                ? '지하안전관리에 관한 특별법'
                : tradeCategory === '건축'
                ? '건축법 시행령 제46조'
                : tradeCategory === '건축기계'
                ? '기계설비기술기준'
                : tradeCategory === '건축전기'
                ? '전기설비기술기준'
                : '소방시설법 / NFTC',
            severity: 'WARNING',
          },
        ]; */

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden bg-[#0a111e] border border-white/20 shadow-2xl flex flex-col justify-between select-none ${className}`}
      style={{ maxHeight }}
    >
      {/* Engineering Header Bar */}
      <div className="bg-[#050914] text-white px-4 py-2 flex flex-wrap items-center justify-between font-mono text-[11px] border-b border-white/10 z-20 gap-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-bold">
            POSCO [{tradeCategory}] 공종 / [{docCategory}] 전문가 AI 검토 엔진
          </span>
          <span className="bg-[#000d5f] text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20">
            {tradeCategory} 기술기준
          </span>
        </div>

        {/* View Toggles & Zoom Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#131d31] px-2 py-1 rounded border border-white/10">
            <button
              onClick={() => setShowMarkupLayer(!showMarkupLayer)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                showMarkupLayer ? 'bg-red-600 text-white shadow' : 'text-white/40 hover:text-white'
              }`}
              title="검토의견 마크업 레이어"
            >
              <MapPin className="w-3 h-3" />
              검토의견 마크업 ({effectiveMarkups.length})
            </button>
            <button
              onClick={() => setShowPipingLayer(!showPipingLayer)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                showPipingLayer ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="주요 관로/구조 레이어"
            >
              🔵 공종 레이어
            </button>
            <button
              onClick={() => setShowOcrLayer(!showOcrLayer)}
              className={`hidden px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                showOcrLayer ? 'bg-emerald-600 text-white' : 'text-white/40 hover:text-white'
              }`}
              title="OCR 오버레이"
            >
              🟢 OCR 레이어
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#131d31] p-1 rounded border border-white/10">
            <button
              onClick={handleZoomOut}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="축소"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-emerald-300 w-9 text-center font-bold">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="확대"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="초기화"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="px-1.5 py-0.5 text-[10px] text-white/70 hover:text-white hover:bg-white/10 rounded cursor-pointer"
              title="화면 맞춤"
            >
              맞춤
            </button>
          </div>
        </div>
      </div>

      {/* Main Drawing Stage Area */}
      <div
        className={`relative flex-1 flex items-center justify-center p-3 overflow-auto bg-[#0a111e] ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleCtrlWheelZoom}
      >
        {/* Render PDF Document if uploaded format is PDF */}
        {isPdfData ? (
          <div
            className="w-full h-full flex flex-col items-center justify-center transition-transform duration-150 relative p-2"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
          >
            {/* PDF Sheet Box & Viewer Stage */}
            <div className="relative w-full max-w-4xl min-h-[500px] bg-white text-gray-900 rounded-lg shadow-2xl border border-gray-300 p-6 flex flex-col justify-between overflow-hidden">
              {/* PDF Header Stamp & Red Markups Indicator */}
              <div className="border-b-2 border-red-600 pb-3 mb-3 flex flex-wrap items-center justify-between font-mono text-xs gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white font-bold px-2.5 py-1 rounded text-xs tracking-wider flex items-center gap-1 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    PDF 미리보기
                  </span>
                  <span className="font-bold text-[#000d5f] text-sm">{title}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded border border-red-300 flex items-center gap-1">
                    🔴 빨간색 마크업 주석 ({effectiveMarkups.length}개 지적)
                  </span>
                  <span className="text-gray-500 font-mono">{dwgNo}</span>
                </div>
              </div>

              {/* Real PDF Embed or Interactive PDF Sheet Content */}
              {rawUrl && isPdfData ? (
                <div className="relative w-full h-[400px]">
                  <object
                    data={rawUrl}
                    type="application/pdf"
                    className="w-full h-full rounded border border-gray-300 shadow-inner"
                  >
                    <iframe
                      src={rawUrl}
                      className="w-full h-full rounded border border-gray-300"
                      title={`${tradeCategory} PDF Document`}
                    />
                  </object>
                </div>
              ) : (
                <div className="w-full h-[390px] bg-gray-50 border border-gray-200 rounded-lg p-5 relative overflow-auto font-mono text-xs text-gray-800 space-y-4 shadow-inner">
                  {previewPages.length > 0 && (
                    <div className="mb-2 flex items-center justify-between rounded bg-slate-900 px-2 py-1 text-[10px] text-white">
                      <span>PDF 원본 페이지 {currentPage + 1} / {previewPages.length}</span>
                      <span className="flex gap-1"><button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}>이전</button><button type="button" disabled={currentPage === previewPages.length - 1} onClick={() => setCurrentPage((p) => Math.min(previewPages.length - 1, p + 1))}>다음</button></span>
                    </div>
                  )}
                  {previewPages.length > 0 && <img src={displayUrl} alt={`${fileName} page ${currentPage + 1}`} className="mb-3 max-h-[360px] w-full object-contain rounded border border-slate-300 bg-white" />}
                  {/* PDF Document Summary Block */}
                  <div className="bg-white p-3.5 rounded-md border border-gray-300 shadow-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-[#000d5f] block">📄 PDF 도면 세부 사양</span>
                      <p className="text-[11px] text-gray-600 mt-0.5 font-sans">
                        공종: <strong className="text-blue-900">{tradeCategory}</strong> | 분류:{' '}
                        <strong>{docCategory}</strong> | 축척: <strong>{scale}</strong> | 엔지니어링 기준:{' '}
                        <strong className="text-emerald-800">KDS / KEC / NFTC 준수</strong>
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-red-600 text-white rounded text-[11px] font-bold shadow-xs">
                      RED ANNOTATIONS ACTIVE
                    </span>
                  </div>

                  {/* Red Law & Error Violation Box 1 */}
                  <div className="bg-red-50/90 border-2 border-red-500 p-4 rounded-lg shadow-xs space-y-2 text-[11px] relative">
                    <div className="flex items-center justify-between border-b border-red-200 pb-1.5 font-bold text-red-900">
                      <span className="flex items-center gap-1.5 text-xs">
                        🔴 [빨간색 주석 1] {tradeCategory} 공종 ({title}) 법규 위반 및 규격 미달 지적
                      </span>
                      <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        CRITICAL
                      </span>
                    </div>
                    <p className="text-red-950 leading-relaxed font-sans bg-white p-2.5 rounded border-l-4 border-red-600 shadow-2xs">
                      {tradeCategory === '토목'
                        ? `${title}: KDS 11 10 00 / KDS 21 30 00 기준 H-Pile 흙막이 앵커 긴장력 부족 및 사면 토압 검토 필요.`
                        : tradeCategory === '건축'
                        ? `${title}: 건축법 시행령 제34조 직통계단 보행거리 38.5m(법정 30m 이하) 초과 및 피난동선 보정 지적.`
                        : tradeCategory === '건축기계'
                        ? `${title}: KDS 31 25 10 공조 급기 덕트(SA) 풍속 8.5m/s 과다(기준 6.0m/s 이하) 및 소음기 설치 필요.`
                        : tradeCategory === '건축전기'
                        ? `${title}: KEC(한국전기설비규정) 230 수전반 메인 케이블 허용전류 및 전선관 충전율 40% 초과 지적.`
                        : `${title}: NFTC 102/103 화재안전기술기준 스프링클러 헤드 살수반경(R=2.3m) 미달 및 가지배관 직경 보정 요구.`}
                    </p>
                  </div>

                  {/* Red Law & Error Violation Box 2 */}
                  <div className="bg-amber-50/90 border-2 border-amber-500 p-4 rounded-lg shadow-xs space-y-2 text-[11px] relative">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-1.5 font-bold text-amber-900">
                      <span className="flex items-center gap-1.5 text-xs">
                        🔴 [빨간색 주석 2] {tradeCategory} 공종 안전성 & 법규 준수 재검토 필요
                      </span>
                      <span className="bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        WARNING
                      </span>
                    </div>
                    <p className="text-amber-950 leading-relaxed font-sans bg-white p-2.5 rounded border-l-4 border-amber-500 shadow-2xs">
                      {tradeCategory === '토목'
                        ? `${title}: 지하안전관리에 관한 특별법 및 KDS 44 50 00 우수관 구배(1/150) 부족 및 계측기(Inclinometer) 누락.`
                        : tradeCategory === '건축'
                        ? `${title}: 건축법 시행령 제46조 방화구획 내화성능 2시간 방화문 표기 및 준불연 단열재 스펙 재확인.`
                        : tradeCategory === '건축기계'
                        ? `${title}: 방화구획 관통부 방화댐퍼(FD) 표기 누락 및 급탕 순환 펌프 양정 수치 보정 필요.`
                        : tradeCategory === '건축전기'
                        ? `${title}: 변전실 방폭구역 등급 지정 및 소방 비상전원 연동 조도(300 Lux) 확보 필요.`
                        : `${title}: 소방시설법 자동화재탐지설비 감지기 감응거리 초과 및 비상전원 수신반 연동 점검.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Red Markups Overlay on PDF Stage */}
              {showMarkupLayer &&
                effectiveMarkups.map((mk, idx) => (
                  <div
                    key={`pdf-mk-${mk.id || idx}`}
                    style={{ top: `${mk.yPercent}%`, left: `${mk.xPercent}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMarkupId(activeMarkupId === mk.id ? null : mk.id);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-40 group"
                  >
                    {/* Pulsing Red Pin */}
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-red-500 opacity-75"></span>
                      <div className="relative inline-flex rounded-full h-8 w-8 bg-red-600 text-white font-mono font-bold text-xs items-center justify-center border-2 border-white shadow-2xl hover:scale-110 transition-transform">
                        {idx + 1}
                      </div>
                    </div>

                    {/* Red Annotation Callout Box */}
                    <div
                      className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl bg-[#1c0404]/95 text-white border-2 border-red-500 shadow-2xl text-[11px] font-sans z-50 transition-all ${
                        activeMarkupId === mk.id ? 'opacity-100 scale-100' : 'opacity-95 group-hover:opacity-100'
                      }`}
                    >
                      <div className="font-bold text-red-200 border-b border-white/20 pb-1 mb-1 flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                          {mk.title}
                        </span>
                        {mk.codeClause && (
                          <span className="text-[9px] bg-red-900 text-red-100 px-1.5 py-0.5 rounded font-mono border border-red-400">
                            {mk.codeClause}
                          </span>
                        )}
                      </div>
                      <p className="text-red-100 text-[10px] leading-relaxed bg-red-950/80 p-2 rounded border-l-2 border-red-400 mt-1">
                        🔴 [빨간색 주석] {mk.comment}
                      </p>
                    </div>
                  </div>
                ))}

              {/* PDF Footer Stamp */}
              <div className="mt-3 pt-2 border-t border-gray-300 flex justify-between items-center text-[10px] font-mono text-gray-500">
                <span>POSCO AI PDF DRAWING VERIFICATION ENGINE</span>
                <span>STATUS: RED MARKUPS ACTIVE</span>
              </div>
            </div>
          </div>
        ) : isImageMime ? (
          /* Render Uploaded Real Image with Zoom & OCR / Markup overlays */
          <div
            className="relative flex items-center justify-center transition-transform duration-150"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
          >
            <img
              src={displayUrl}
              alt="Uploaded Engineering Document"
              onError={() => setImageError(true)}
              className="max-w-full object-contain rounded shadow-2xl border border-white/20"
              style={{ maxHeight: '480px' }}
            />

            {showOcrLayer && ocrBlocks.map((block, index) => {
              const bbox = block.bbox || { x: 8 + (index % 3) * 28, y: 12 + Math.floor(index / 3) * 16, width: 20, height: 8 };
              const id = block.id || `ocr-${index}`;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={`OCR 영역: ${block.text}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOcrBlockSelect?.(id);
                  }}
                  className={`absolute border-2 rounded-sm transition-colors ${selectedOcrBlockId === id ? 'border-yellow-300 bg-yellow-300/30 shadow-[0_0_0_3px_rgba(253,224,71,0.35)]' : 'border-emerald-400/80 bg-emerald-400/10 hover:bg-emerald-400/25'}`}
                  style={{ left: `${bbox.x}%`, top: `${bbox.y}%`, width: `${bbox.width}%`, height: `${bbox.height}%` }}
                >
                  <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-emerald-950/90 px-1 text-[9px] text-emerald-100">
                    OCR {block.confidence ?? 0}%
                  </span>
                </button>
              );
            })}

            {/* Visual Review Markups Overlay on Uploaded Image */}
            {showMarkupLayer &&
              effectiveMarkups.map((mk, idx) => (
                <div
                  key={mk.id || `mk-${idx}`}
                  style={{ top: `${mk.yPercent}%`, left: `${mk.xPercent}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMarkupId(activeMarkupId === mk.id ? null : mk.id);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-30 group"
                >
                  {/* Pin Circle */}
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-75"></span>
                    <div className={`relative inline-flex rounded-full h-8 w-8 ${markupTone(mk)} text-white font-mono font-bold text-xs items-center justify-center border-2 border-white shadow-xl hover:scale-110 transition-transform cursor-move`}>
                      {idx + 1}
                    </div>
                  </div>

                  {/* Markup Callout Box */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 mt-2 w-64 p-2.5 rounded-lg bg-[#050914]/95 text-white border border-red-500 shadow-2xl text-[11px] font-sans z-40 transition-all ${
                      activeMarkupId === mk.id ? 'opacity-100 scale-100' : 'opacity-90 group-hover:opacity-100'
                    }`}
                  >
                    <div className="font-bold text-red-300 border-b border-white/10 pb-1 mb-1 flex justify-between items-center">
                      <span>{mk.title}</span>
                      {mk.codeClause && (
                        <span className="text-[9px] bg-red-950 text-red-200 px-1.5 py-0.5 rounded font-mono">
                          {mk.codeClause}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-200 text-[10px] leading-relaxed">{mk.comment}</p>
                  </div>
                </div>
              ))}

            {/* Error Hotspot Badge on Image */}
            {highlightError && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-24 h-24 border-2 border-red-500 rounded-full animate-ping flex items-center justify-center bg-red-500/20">
                  <span className="bg-[#ba1a1a] text-white px-2 py-1 text-[10px] font-mono font-bold rounded shadow-lg whitespace-nowrap mt-28 border border-white/30">
                    ⚠️ {highlightError.errorCode || `${tradeCategory} 지적`}: {highlightError.description}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Render Specialized Trade CAD Vector Drawing */
          <div
            className="w-full h-full flex items-center justify-center transition-transform duration-150 relative"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})` }}
          >
            <svg
              viewBox="0 0 1000 640"
              className="w-full h-auto max-h-[480px] object-contain filter drop-shadow-xl"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* CAD Blueprint Grid Pattern */}
                <pattern id="tradeGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1c2c4a" strokeWidth="0.8" />
                </pattern>
                <pattern id="tradeSubgrid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#121e33" strokeWidth="0.4" />
                </pattern>
                {/* Warning Glow Filter */}
                <filter id="tradeGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Blueprint Grid Background */}
              <rect width="1000" height="640" fill="#0a111e" />
              <rect width="1000" height="640" fill="url(#tradeSubgrid)" />
              <rect width="1000" height="640" fill="url(#tradeGrid)" />

              {/* Drawing Border Lines */}
              <rect x="20" y="20" width="960" height="600" fill="none" stroke="#253e66" strokeWidth="2" />
              <rect x="25" y="25" width="950" height="590" fill="none" stroke="#162742" strokeWidth="1" />

              {/* Grid Axes (X1~X5, Y1~Y4) */}
              {[100, 300, 500, 700, 900].map((x, idx) => (
                <g key={`x-${idx}`}>
                  <line x1={x} y1="40" x2={x} y2="520" stroke="#1a3258" strokeWidth="1" strokeDasharray="5 4" />
                  <circle cx={x} cy="35" r="11" fill="#050914" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x={x} y="39" textAnchor="middle" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    X{idx + 1}
                  </text>
                </g>
              ))}

              {[100, 240, 380, 520].map((y, idx) => (
                <g key={`y-${idx}`}>
                  <line x1="40" y1={y} x2="960" y2={y} stroke="#1a3258" strokeWidth="1" strokeDasharray="5 4" />
                  <circle cx="35" cy={y} r="11" fill="#050914" stroke="#3b82f6" strokeWidth="1.5" />
                  <text x="35" y={y + 4} textAnchor="middle" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                    Y{idx + 1}
                  </text>
                </g>
              ))}

              {/* Architectural Outer Frame */}
              <rect x="100" y="100" width="800" height="420" fill="#111c30" fillOpacity="0.4" stroke="#475569" strokeWidth="3" />

              {/* Structural Columns */}
              {[100, 300, 500, 700, 900].flatMap((x) =>
                [100, 240, 380, 520].map((y) => (
                  <rect key={`c-${x}-${y}`} x={x - 8} y={y - 8} width="16" height="16" fill="#1e293b" stroke="#64748b" strokeWidth="1" />
                ))
              )}

              {/* ==================== TRADE-SPECIFIC VECTOR CAD RENDERING ==================== */}
              {tradeCategory === '토목' ? (
                /* 토목 (Civil) CAD Layer */
                <g id="civil-cad-layer">
                  {/* Excavation Line & Retaining Wall */}
                  <path d="M 120 120 L 880 120 L 880 480 L 120 480 Z" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 4" />
                  <text x="500" y="112" textAnchor="middle" fill="#fef08a" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    흙막이 가설 구조물 H-Pile 300x300 @1.5m (H=12.5m)
                  </text>

                  {/* Ground Anchors */}
                  {[200, 400, 600, 800].map((x, i) => (
                    <line key={`anchor-${i}`} x1={x} y1="120" x2={x - 20} y2="80" stroke="#fbbf24" strokeWidth="2.5" />
                  ))}

                  {/* Drainage Pipes (PE Pipe D600) */}
                  <line x1="150" y1="450" x2="850" y2="450" stroke="#38bdf8" strokeWidth="4" />
                  <text x="500" y="470" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace">
                    우수 배수관 D600 (계획 경사 1/150)
                  </text>
                </g>
              ) : tradeCategory === '건축' ? (
                /* 건축 (Architectural) CAD Layer */
                <g id="arch-cad-layer">
                  {/* Fire Compartment Wall */}
                  <line x1="450" y1="100" x2="450" y2="520" stroke="#ef4444" strokeWidth="4" />
                  <text x="440" y="300" textAnchor="end" fill="#fca5a5" fontSize="10" fontFamily="sans-serif" fontWeight="bold" transform="rotate(-90 440 300)">
                    방화벽 (내화구조 2시간 / F60 갑종방화문)
                  </text>

                  {/* Evacuation Stair Core */}
                  <rect x="750" y="120" width="120" height="150" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <text x="810" y="195" textAnchor="middle" fill="#93c5fd" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                    직통 피난계단
                  </text>
                  <line x1="150" y1="350" x2="750" y2="195" stroke="#fbbf24" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="450" y="260" textAnchor="middle" fill="#fef08a" fontSize="10" fontFamily="monospace">
                    보행거리 L=38.5m (법정기준 30m 초과 지적)
                  </text>
                </g>
              ) : tradeCategory === '건축기계' ? (
                /* 건축기계 (Mechanical HVAC) CAD Layer */
                <g id="mech-cad-layer">
                  {/* HVAC Supply Duct (SA 500x350) */}
                  <rect x="150" y="200" width="700" height="40" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="2" />
                  <text x="500" y="225" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    급기 덕트 SA 500x350 (풍량 3,500 CMH / 정압 250Pa)
                  </text>

                  {/* Fire Damper (FD) */}
                  <rect x="440" y="190" width="20" height="60" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
                  <text x="450" y="182" textAnchor="middle" fill="#fca5a5" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
                    FD (방화댐퍼)
                  </text>
                </g>
              ) : tradeCategory === '건축전기' ? (
                /* 건축전기 (Electrical) CAD Layer */
                <g id="elec-cad-layer">
                  {/* Cable Tray */}
                  <line x1="120" y1="280" x2="880" y2="280" stroke="#a855f7" strokeWidth="4" />
                  <text x="500" y="270" textAnchor="middle" fill="#e9d5ff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    강전 케이블 트레이 400W (TFR-CV 3C 185sq)
                  </text>

                  {/* Transformer & Substation Room */}
                  <rect x="120" y="340" width="160" height="120" fill="#1e1b4b" stroke="#c084fc" strokeWidth="2" />
                  <text x="200" y="380" textAnchor="middle" fill="#f3e8ff" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                    수변전실 (TR 1,500kVA)
                  </text>
                  <text x="200" y="410" textAnchor="middle" fill="#c084fc" fontSize="9" fontFamily="monospace">
                    KEC 통합접지 & SPD Class II
                  </text>
                </g>
              ) : (
                /* 소방 (Fire Protection) CAD Layer */
                <g id="fire-cad-layer">
                  {/* Sprinkler Riser Main Pipe */}
                  <line x1="120" y1="120" x2="880" y2="120" stroke="#ef4444" strokeWidth="4" />
                  <text x="500" y="112" textAnchor="middle" fill="#fca5a5" fontSize="11" fontFamily="monospace" fontWeight="bold">
                    스프링클러 주배관 100A (NFTC 103)
                  </text>

                  {/* Branch Piping & Sprinkler Heads */}
                  {[200, 350, 500, 650, 800].map((x, i) => (
                    <g key={`branch-${i}`}>
                      <line x1={x} y1="120" x2={x} y2="480" stroke="#f87171" strokeWidth="2.5" />
                      {[180, 280, 380, 480].map((y) => (
                        <circle key={`head-${x}-${y}`} cx={x} cy={y} r="5" fill="#dc2626" stroke="#ffffff" strokeWidth="1" />
                      ))}
                    </g>
                  ))}
                </g>
              )}

              {/* ==================== OCR TEXT LAYER OVERLAY ON SVG CAD ==================== */}
              {showOcrLayer &&
                ocrBlocks &&
                ocrBlocks.length > 0 &&
                ocrBlocks.map((blk, bIdx) => {
                  const ocrX = 110 + ((bIdx * 250) % 550);
                  const ocrY = 160 + Math.floor(bIdx / 2) * 85;
                  return (
                    <g key={`svg-ocr-${blk.id || bIdx}`} transform={`translate(${ocrX}, ${ocrY})`}>
                      <rect
                        x="0"
                        y="0"
                        width="220"
                        height="38"
                        rx="5"
                        fill="#064e3b"
                        fillOpacity="0.85"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                      />
                      <text x="8" y="16" fill="#a7f3d0" fontSize="9" fontFamily="monospace" fontWeight="bold">
                        🟢 OCR [{blk.category || '텍스트 스캔'}]:
                      </text>
                      <text x="8" y="29" fill="#ffffff" fontSize="9.5" fontFamily="sans-serif">
                        {blk.text.length > 25 ? blk.text.substring(0, 23) + '...' : blk.text}
                      </text>
                    </g>
                  );
                })}

              {/* ==================== VISUAL REVIEW MARKUPS OVERLAY ON SVG CAD ==================== */}
              {showMarkupLayer &&
                effectiveMarkups.map((mk, idx) => {
                  const svgX = (mk.xPercent / 100) * 1000;
                  const svgY = (mk.yPercent / 100) * 640;
                  return (
                    <g key={`svg-mk-${mk.id || idx}`} transform={`translate(${svgX}, ${svgY})`}>
                      {/* Pulse Ring */}
                      <circle cx="0" cy="0" r="22" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="2" filter="url(#tradeGlow)">
                        <animate attributeName="r" values="18;28;18" dur="2s" repeatCount="indefinite" />
                      </circle>
                      {/* Center Pin Badge */}
                      <circle cx="0" cy="0" r="14" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
                      <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontFamily="monospace" fontWeight="bold">
                        {idx + 1}
                      </text>

                      {/* Callout Box */}
                      <g transform="translate(-110, 20)">
                        <rect x="0" y="0" width="220" height="50" rx="6" fill="#050914" fillOpacity="0.95" stroke="#ef4444" strokeWidth="1.5" />
                        <text x="10" y="18" fill="#fca5a5" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                          {mk.title.length > 22 ? mk.title.substring(0, 20) + '...' : mk.title}
                        </text>
                        <text x="10" y="34" fill="#e2e8f0" fontSize="9" fontFamily="sans-serif">
                          {mk.comment.length > 28 ? mk.comment.substring(0, 26) + '...' : mk.comment}
                        </text>
                      </g>
                    </g>
                  );
                })}

              {/* ==================== TITLE BLOCK (표제란) ==================== */}
              <g transform="translate(680, 470)">
                <rect x="0" y="0" width="290" height="150" fill="#050914" stroke="#38bdf8" strokeWidth="2" />
                <line x1="0" y1="32" x2="290" y2="32" stroke="#1e293b" strokeWidth="1" />
                <line x1="0" y1="64" x2="290" y2="64" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="96" x2="290" y2="96" stroke="#1e293b" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="120" y1="32" x2="120" y2="150" stroke="#1e293b" strokeWidth="1" />

                <text x="145" y="22" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                  POSCO ENGINEERING SYSTEM
                </text>
                <text x="10" y="50" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                  공 종 (TRADE)
                </text>
                <text x="128" y="50" fill="#38bdf8" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                  {tradeCategory} ({docCategory})
                </text>

                <text x="10" y="82" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                  도면명 (TITLE)
                </text>
                <text x="128" y="82" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
                  {title.length > 17 ? title.substring(0, 15) + '...' : title}
                </text>

                <text x="10" y="114" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
                  도면번호 / 축척
                </text>
                <text x="128" y="114" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  {dwgNo} ({scale})
                </text>

                <text x="10" y="140" fill="#94a3b8" fontSize="9" fontFamily="sans-serif">
                  검토 상태
                </text>
                <text x="128" y="140" fill="#34d399" fontSize="9" fontFamily="sans-serif" fontWeight="bold">
                  {tradeCategory} AI 전문가 검토 및 마크업 완료
                </text>
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Footer Status Line */}
      <div className="bg-[#050914] text-white/80 px-4 py-1.5 flex flex-wrap items-center justify-between font-mono text-[10px] border-t border-white/10 gap-2 z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <FileCheck className="w-3.5 h-3.5" />
            [{tradeCategory}] {docCategory} 전용 검토 및 마크업 레이어 적용
          </span>
          <span className="text-white/60">
            [마크업 핀: {effectiveMarkups.length}개 지적 / 코멘트 표기]
          </span>
        </div>
        <span className="text-amber-400 font-bold">POSCO AI ENGINEERING ACTIVE</span>
      </div>
    </div>
  );
};
