import React, { useState, useEffect } from 'react';
import { PdfCanvasRenderer } from './PdfCanvasRenderer';
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
  fileDataUrl?: string;
  cadUrl?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  fileName?: string;
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  ocrBlocks?: { id?: string; text: string; category: string; confidence?: number }[];
  markups?: ReviewMarkup[];
  highlightError?: { errorCode?: string; description?: string };
  className?: string;
  maxHeight?: string;
}

function getBlobUrlFromDataUrl(dataUrl: string): string | null {
  if (!dataUrl) return null;
  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    let mime = 'application/pdf';
    const mimeMatch = parts[0].match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1] && mimeMatch[1] !== 'application/octet-stream') {
      mime = mimeMatch[1];
    }
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Failed to convert data URL to Blob URL:', err);
    return null;
  }
}

export const DrawingCanvasPreview: React.FC<DrawingCanvasPreviewProps> = ({
  fileDataUrl,
  cadUrl,
  drawingTitle,
  drawingNumber,
  scale = '1 : 100',
  fileName,
  docCategory = '도면',
  tradeCategory = '소방',
  ocrBlocks = [],
  markups = [],
  highlightError,
  className = '',
  maxHeight = '580px',
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showPipingLayer, setShowPipingLayer] = useState<boolean>(true);
  const [showDetectionLayer, setShowDetectionLayer] = useState<boolean>(true);
  const [showRadiusLayer, setShowRadiusLayer] = useState<boolean>(true);
  const [showOcrLayer, setShowOcrLayer] = useState<boolean>(true);
  const [showMarkupLayer, setShowMarkupLayer] = useState<boolean>(true);
  const [activeMarkupId, setActiveMarkupId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const rawUrl = fileDataUrl || cadUrl;

  // Generate safe Blob URL for iframe embedding and popup viewing
  useEffect(() => {
    if (rawUrl && rawUrl.startsWith('data:')) {
      const created = getBlobUrlFromDataUrl(rawUrl);
      setBlobUrl(created);
      return () => {
        if (created && created.startsWith('blob:')) {
          URL.revokeObjectURL(created);
        }
      };
    } else if (rawUrl && (rawUrl.startsWith('blob:') || rawUrl.startsWith('http'))) {
      setBlobUrl(rawUrl);
    } else {
      setBlobUrl(null);
    }
  }, [rawUrl]);

  // Check data format (handles .pdf files, base64 PDF data, and drawing category items)
  const isPdfData = Boolean(
    (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
    (fileDataUrl && fileDataUrl.includes('application/pdf')) ||
    (cadUrl && cadUrl.toLowerCase().endsWith('.pdf')) ||
    (rawUrl && (rawUrl.startsWith('data:application/pdf') || rawUrl.toLowerCase().endsWith('.pdf') || rawUrl.includes('type=pdf'))) ||
    docCategory === '도면'
  );

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

  const title = drawingTitle || fileName || `${tradeCategory} ${docCategory} 정밀 검토도`;
  const dwgNo = drawingNumber || `DWG-${tradeCategory.substring(0, 2).toUpperCase()}-2024-001`;

  const handleOpenNewWindow = () => {
    const w = window.open('', '_blank');
    if (w) {
      const markupHtml = effectiveMarkups.map((m, idx) => `
        <div style="background:#fef2f2; border:2px solid #ef4444; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; color:#991b1b; margin-bottom:6px;">
            <span style="font-size:13px;">🔴 [빨간색 주석 ${idx + 1}] ${m.title || '기술기준 및 시공 상세 지적'}</span>
            <span style="background:#dc2626; color:white; padding:2px 8px; border-radius:4px; font-size:10px; font-family:monospace;">${m.severity || 'CRITICAL'}</span>
          </div>
          <div style="color:#7f1d1d; font-size:12px; line-height:1.5; background:white; padding:10px; border-radius:6px; border-left:4px solid #dc2626; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            ${m.comment}
          </div>
          ${m.codeClause ? `<div style="font-size:11px; color:#991b1b; margin-top:6px; font-family:monospace;"><strong>적용 법규/기술기준:</strong> ${m.codeClause}</div>` : ''}
        </div>
      `).join('');

      w.document.write(`
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="utf-8">
          <title>[POSCO AI] ${title} - PDF 도면 및 마크업 검토 보고서</title>
          <style>
            body { margin: 0; padding: 24px; background: #0b1329; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; }
            .card { background: #1e293b; border: 2px solid #3b82f6; border-radius: 1rem; max-width: 900px; width: 100%; padding: 2rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #ef4444; padding-bottom: 1rem; margin-bottom: 1.5rem; }
            .tag { background: #ef4444; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-weight: bold; font-size: 0.75rem; font-family: monospace; }
            h1 { margin: 0.5rem 0 0.25rem 0; font-size: 1.35rem; color: #60a5fa; }
            .meta { font-size: 0.8rem; color: #94a3b8; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #0f172a; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem; font-size: 0.8rem; }
            .grid-label { color: #64748b; font-size: 0.7rem; display: block; margin-bottom: 2px; }
            .grid-val { font-weight: bold; color: #e2e8f0; font-family: monospace; }
            .section-title { color: #fca5a5; font-size: 0.95rem; font-weight: bold; margin: 1.5rem 0 0.75rem 0; }
            .btn-print { background: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; }
            .btn-print:hover { background: #1d4ed8; }
            @media print {
              body { background: white; color: black; }
              .card { box-shadow: none; border: none; background: white; color: black; }
              .btn-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <span class="tag">POSCO PLANT AI ENGINEERING REVIEW</span>
                <h1>${title}</h1>
                <div class="meta">도서구분: ${docCategory} | 공종: ${tradeCategory} | 축척: ${scale}</div>
              </div>
              <div style="text-align: right;">
                <button class="btn-print" onclick="window.print()">🖨️ 보고서 인쇄 / PDF 저장</button>
                <div style="font-family: monospace; font-size: 11px; color: #94a3b8; margin-top: 8px;">${dwgNo}</div>
              </div>
            </div>

            <div class="grid">
              <div><span class="grid-label">파일명</span><span class="grid-val">${fileName || title}</span></div>
              <div><span class="grid-label">공종</span><span class="grid-val">${tradeCategory}</span></div>
              <div><span class="grid-label">도서분류</span><span class="grid-val">${docCategory}</span></div>
              <div><span class="grid-label">기술기준</span><span class="grid-val">KDS/KEC/NFTC</span></div>
            </div>

            <div class="section-title">🔴 빨간색 마크업 지적 및 법규 준수 검토결과 (${effectiveMarkups.length}건)</div>
            ${markupHtml}

            <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #334155; text-align: center; font-family: monospace; font-size: 0.7rem; color: #64748b;">
              POSCO PLANT ENGINEERING DIVISION - AI AUTOMATED DRAWING REVIEW
            </div>
          </div>
        </body>
        </html>
      `);
      w.document.close();
    }
  };

  // Default fallback markups if none provided
  const effectiveMarkups: ReviewMarkup[] =
    markups && markups.length > 0
      ? markups
      : [
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
        ];

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
          {isPdfData && (
            <button
              onClick={handleOpenNewWindow}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="PDF 원본 새 탭에서 열기"
            >
              <FileCheck className="w-3.5 h-3.5" />
              PDF 원본 새 탭 보기
            </button>
          )}

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
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
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
          </div>
        </div>
      </div>

      {/* Main Drawing Stage Area */}
      <div className="relative flex-1 flex items-center justify-center p-3 overflow-auto bg-[#0a111e]">
        {/* Render PDF Document if uploaded format is PDF */}
        {isPdfData ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2">
            <PdfCanvasRenderer
              pdfSource={blobUrl || rawUrl}
              tradeCategory={tradeCategory}
              docCategory={docCategory}
              drawingTitle={title}
              drawingNumber={dwgNo}
              scale={scale}
              markups={effectiveMarkups}
              showMarkupLayer={showMarkupLayer}
              activeMarkupId={activeMarkupId}
              onSelectMarkup={(id) => setActiveMarkupId(id)}
              className="w-full h-[550px]"
            />
          </div>
        ) : isImageMime ? (
          /* Render Uploaded Real Image with Zoom & OCR / Markup overlays */
          <div
            className="relative flex items-center justify-center transition-transform duration-150"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={rawUrl}
              alt="Uploaded Engineering Document"
              onError={() => setImageError(true)}
              className="max-w-full object-contain rounded shadow-2xl border border-white/20"
              style={{ maxHeight: '480px' }}
            />

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
                    <div className="relative inline-flex rounded-full h-8 w-8 bg-red-600 text-white font-mono font-bold text-xs items-center justify-center border-2 border-white shadow-xl hover:scale-110 transition-transform">
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
            style={{ transform: `scale(${zoomLevel})` }}
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
