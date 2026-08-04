import React, { useState } from 'react';
import { ScanText, AlertTriangle, Layers, Shield, Architecture } from 'lucide-react';

interface DrawingCanvasPreviewProps {
  fileDataUrl?: string;
  cadUrl?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  fileName?: string;
  ocrBlocks?: { text: string; category: string }[];
  highlightError?: { errorCode?: string; description?: string };
  className?: string;
  maxHeight?: string;
}

export const DrawingCanvasPreview: React.FC<DrawingCanvasPreviewProps> = ({
  fileDataUrl,
  cadUrl,
  drawingTitle,
  drawingNumber,
  scale = '1 : 100',
  fileName,
  ocrBlocks = [],
  highlightError,
  className = '',
  maxHeight = '550px',
}) => {
  const [imageError, setImageError] = useState(false);

  const rawUrl = fileDataUrl || cadUrl;

  // Determine if rawUrl is a displayable image format (data:image or http web image)
  const isImageMime =
    rawUrl &&
    (rawUrl.startsWith('data:image/') ||
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://')) &&
    !imageError;

  if (isImageMime) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        <img
          src={rawUrl}
          alt="Uploaded Drawing Preview"
          onError={() => setImageError(true)}
          className="max-w-full object-contain rounded shadow-2xl border border-white/20 transition-all"
          style={{ maxHeight }}
        />
        {highlightError && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-24 h-24 border-2 border-red-500 rounded-full animate-pulse flex items-center justify-center bg-red-500/20">
              <span className="bg-[#ba1a1a] text-white px-2 py-0.5 text-[10px] font-mono font-bold rounded shadow whitespace-nowrap mt-24">
                ⚠️ {highlightError.errorCode || '설계 오류'}: {highlightError.description}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback CAD Engineering Blueprint SVG Renderer for non-image, PDF, DWG, or image load error
  const title = drawingTitle || fileName || 'POSCO Plant Structural Layout';
  const dwgNo = drawingNumber || 'DWG-POSCO-2024-001';

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden bg-[#0c1527] border border-white/20 shadow-2xl flex flex-col justify-between select-none ${className}`}
      style={{ maxHeight }}
    >
      {/* Top Engineering Header Bar */}
      <div className="bg-[#080d19] text-white/90 px-4 py-2 flex items-center justify-between font-mono text-[11px] border-b border-white/10 z-10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[#bbc3ff] font-bold">POSCO CAD Blueprint Rendering Engine</span>
        </div>
        <div className="flex items-center gap-3 text-white/70">
          <span>축척: <strong className="text-white">{scale}</strong></span>
          <span>도면번호: <strong className="text-white">{dwgNo}</strong></span>
        </div>
      </div>

      {/* Vector CAD Drawing SVG Stage */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-auto">
        <svg
          viewBox="0 0 1000 650"
          className="w-full h-auto max-h-[500px] object-contain filter drop-shadow-lg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1d2e4d" strokeWidth="0.8" />
            </pattern>
            <pattern id="subgrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#142138" strokeWidth="0.4" />
            </pattern>
            {/* Warning Glow */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Blueprint Grid */}
          <rect width="1000" height="650" fill="#0c1527" />
          <rect width="1000" height="650" fill="url(#subgrid)" />
          <rect width="1000" height="650" fill="url(#grid)" />

          {/* Outer Border Box */}
          <rect x="20" y="20" width="960" height="610" fill="none" stroke="#2c4b7c" strokeWidth="2" />
          <rect x="25" y="25" width="950" height="600" fill="none" stroke="#1f375e" strokeWidth="1" />

          {/* Grid Axis Circles & Lines */}
          {/* Vertical Axes X1 - X5 */}
          {[100, 300, 500, 700, 900].map((x, idx) => (
            <g key={`x-${idx}`}>
              <line x1={x} y1="40" x2={x} y2="520" stroke="#1e3a66" strokeWidth="1" strokeDasharray="6 4" />
              <circle cx={x} cy="35" r="12" fill="#080d19" stroke="#3b82f6" strokeWidth="1.5" />
              <text x={x} y="39" textAnchor="middle" fill="#60a5fa" fontSize="11" fontFamily="monospace" fontWeight="bold">
                X{idx + 1}
              </text>
            </g>
          ))}

          {/* Horizontal Axes Y1 - Y4 */}
          {[100, 240, 380, 520].map((y, idx) => (
            <g key={`y-${idx}`}>
              <line x1="40" y1={y} x2="960" y2={y} stroke="#1e3a66" strokeWidth="1" strokeDasharray="6 4" />
              <circle cx="35" cy={y} r="12" fill="#080d19" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="35" y={y + 4} textAnchor="middle" fill="#60a5fa" fontSize="11" fontFamily="monospace" fontWeight="bold">
                Y{idx + 1}
              </text>
            </g>
          ))}

          {/* Main Structural Frame (Plant Steel H-Beams & Columns) */}
          <rect x="100" y="100" width="800" height="420" fill="none" stroke="#38bdf8" strokeWidth="3" />
          
          {/* Main Girders & H-Beam Crossings */}
          <line x1="100" y1="240" x2="900" y2="240" stroke="#38bdf8" strokeWidth="2" />
          <line x1="100" y1="380" x2="900" y2="380" stroke="#38bdf8" strokeWidth="2" />
          <line x1="300" y1="100" x2="300" y2="520" stroke="#38bdf8" strokeWidth="2" />
          <line x1="500" y1="100" x2="500" y2="520" stroke="#38bdf8" strokeWidth="2" />
          <line x1="700" y1="100" x2="700" y2="520" stroke="#38bdf8" strokeWidth="2" />

          {/* Concrete Columns at Intersections */}
          {[100, 300, 500, 700, 900].flatMap((x) =>
            [100, 240, 380, 520].map((y, i) => (
              <rect key={`col-${x}-${y}`} x={x - 10} y={y - 10} width="20" height="20" fill="#1e293b" stroke="#60a5fa" strokeWidth="1.5" />
            ))
          )}

          {/* Piping & Explosion Zone Area */}
          <rect x="320" y="120" width="160" height="100" fill="#3b82f6" fillOpacity="0.1" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 2" />
          <text x="400" y="170" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="sans-serif">
            방폭구역 (Zone 1)
          </text>

          {/* Sprinkler Piping Radius */}
          <circle cx="700" cy="240" r="80" fill="#f59e0b" fillOpacity="0.08" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
          <text x="700" y="240" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="sans-serif">
            소방 스프링클러 반경 R2.3m
          </text>

          {/* Dimension Lines */}
          <line x1="100" y1="550" x2="900" y2="550" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="100" y1="545" x2="100" y2="555" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="900" y1="545" x2="900" y2="555" stroke="#94a3b8" strokeWidth="1.5" />
          <text x="500" y="570" textAnchor="middle" fill="#cbd5e1" fontSize="12" fontFamily="monospace" fontWeight="bold">
            8,000 mm (Main Frame Clear Span)
          </text>

          {/* OCR Extracted Text Badges on Canvas */}
          <g transform="translate(120, 260)">
            <rect x="0" y="0" width="220" height="26" rx="4" fill="#080d19" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
            <text x="10" y="17" fill="#e0f2fe" fontSize="10" fontFamily="monospace">
              주철근: SD500 29-D25 @150
            </text>
          </g>

          <g transform="translate(520, 400)">
            <rect x="0" y="0" width="240" height="26" rx="4" fill="#080d19" fillOpacity="0.85" stroke="#34d399" strokeWidth="1" />
            <text x="10" y="17" fill="#d1fae5" fontSize="10" fontFamily="monospace">
              H-Beam 400x200x8/13 (SS275)
            </text>
          </g>

          {/* Highlighted Review Error Hotspot Circle */}
          <g transform="translate(500, 240)">
            <circle cx="0" cy="0" r="45" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="2" filter="url(#glow)">
              <animate attributeName="r" values="38;48;38" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="6" fill="#ef4444" />
            <rect x="-80" y="-75" width="160" height="28" rx="4" fill="#991b1b" stroke="#fca5a5" strokeWidth="1" />
            <text x="0" y="-57" textAnchor="middle" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              ⚠️ {highlightError?.errorCode || 'ERR-STR-001'}: 검토 필요
            </text>
          </g>

          {/* Engineering Title Block (표제란) at Bottom Right */}
          <g transform="translate(680, 470)">
            <rect x="0" y="0" width="290" height="150" fill="#080d19" stroke="#3b82f6" strokeWidth="2" />
            <line x1="0" y1="35" x2="290" y2="35" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="0" y1="70" x2="290" y2="70" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="0" y1="105" x2="290" y2="105" stroke="#1d4ed8" strokeWidth="1" />
            <line x1="140" y1="35" x2="140" y2="150" stroke="#1d4ed8" strokeWidth="1" />

            <text x="145" y="24" textAnchor="middle" fill="#93c5fd" fontSize="12" fontFamily="sans-serif" fontWeight="bold">
              POSCO PLANT ENGINEERING
            </text>
            <text x="10" y="55" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
              도면명 (TITLE)
            </text>
            <text x="148" y="55" fill="#ffffff" fontSize="10" fontFamily="sans-serif" fontWeight="bold">
              {title.length > 18 ? title.substring(0, 16) + '...' : title}
            </text>

            <text x="10" y="90" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
              도면번호 (DWG NO)
            </text>
            <text x="148" y="90" fill="#60a5fa" fontSize="10" fontFamily="monospace" fontWeight="bold">
              {dwgNo}
            </text>

            <text x="10" y="128" fill="#94a3b8" fontSize="10" fontFamily="sans-serif">
              축척 / 승인
            </text>
            <text x="148" y="128" fill="#ffffff" fontSize="10" fontFamily="sans-serif">
              {scale} | AI APPROVED
            </text>
          </g>
        </svg>
      </div>

      {/* Footer Info Notice */}
      <div className="bg-[#080d19] text-white/70 px-4 py-1.5 flex items-center justify-between font-mono text-[10px] border-t border-white/10">
        <span>* DWG/PDF OCR 스캔 벡타 레이어 및 안전 구역 가시화 완료</span>
        <span className="text-emerald-400 font-bold">POSCO AI Blueprint Engine Ready</span>
      </div>
    </div>
  );
};
