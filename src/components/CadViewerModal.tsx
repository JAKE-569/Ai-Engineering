import React, { useState } from 'react';
import { DesignErrorItem } from '../types';
import { X, ZoomIn, ZoomOut, Move, CheckCircle, MessageSquare } from 'lucide-react';

interface CadViewerModalProps {
  errorItem: DesignErrorItem | null;
  onClose: () => void;
  onApproveFix?: (id: string) => void;
}

export const CadViewerModal: React.FC<CadViewerModalProps> = ({ errorItem, onClose, onApproveFix }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isApproved, setIsApproved] = useState(false);
  const [annotations, setAnnotations] = useState<string[]>([]);
  const [newAnnotation, setNewAnnotation] = useState('');
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);

  if (!errorItem) return null;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.2, 0.6));

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return;
    setAnnotations([...annotations, newAnnotation]);
    setNewAnnotation('');
    setShowAnnotationInput(false);
  };

  const handleApprove = () => {
    setIsApproved(true);
    if (onApproveFix) onApproveFix(errorItem.id);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 md:p-8 animate-fadeIn">
      <div className="bg-white w-full max-w-6xl h-[88vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-[#c6c5d2]">
        {/* Header */}
        <div className="h-14 bg-[#e0e3e5] border-b border-[#c6c5d2] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#000d5f] text-xl">architecture</span>
            <span className="font-headline font-bold text-sm text-[#191c1e]">
              Integrated CAD Viewer - {errorItem.dwgFile}
            </span>
            <span className="bg-[#000d5f] text-white text-[10px] font-mono px-2 py-0.5 rounded">
              {errorItem.errorCode}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[#ffdad6] hover:text-[#93000a] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CAD Canvas Area */}
        <div className="flex-1 bg-[#1e1e1e] relative overflow-hidden flex items-center justify-center p-6 select-none">
          {/* Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              title="확대"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              title="축소"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded border border-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
              title="기본 크기"
            >
              <Move className="w-5 h-5" />
            </button>
          </div>

          {/* Blueprint Image & Hotspot */}
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded">
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center relative"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={
                  errorItem.cadUrl ||
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDuYHz6E_iQMsH4lEdZRH2ljS34R-ucm3gT6OSbdks3iM5xW6rXXoORT2LE9vN0WW5AhfyCwdnOwuDT4wLQm1DUTmvwO13JvHzGQ3eVVexqI5BetQGzqQjC0aupjTyTo5FG1hyt-nUVd04xd4--uw6GWPsfJyhm5hfMKUYLOaWrgluqcLu168I4xS4B_FLFRiaNdeUip_Iwxugr5LUWR63as8XMzt3aj7pO57Yb4jpefoxlEEP-sG8XNg'
                }
                alt="CAD 도면 미리보기"
                className="max-w-full max-h-[62vh] opacity-85 object-contain rounded border border-white/10"
              />

              {/* Error Hotspot Marker */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="w-24 h-24 border-2 border-[#ba1a1a] rounded-full animate-pulse flex flex-col items-center justify-center bg-red-500/10">
                  <span className="bg-[#ba1a1a] text-white px-2 py-1 text-[10px] font-mono font-bold rounded shadow-md whitespace-nowrap mt-28">
                    {errorItem.errorCode}: {errorItem.description}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Annotations List */}
          {annotations.length > 0 && (
            <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md text-white p-3 rounded-lg max-w-xs border border-white/20 text-xs">
              <p className="font-bold text-[#bbc3ff] mb-1">등록된 엔지니어 주석 ({annotations.length})</p>
              <ul className="space-y-1 list-disc pl-4 text-[11px] text-gray-200">
                {annotations.map((ann, idx) => (
                  <li key={idx}>{ann}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Annotation Input Popup */}
        {showAnnotationInput && (
          <div className="p-3 bg-[#eceef0] border-t border-[#c6c5d2] flex gap-2 items-center">
            <input
              type="text"
              value={newAnnotation}
              onChange={(e) => setNewAnnotation(e.target.value)}
              placeholder="도면에 표시할 주석 입력..."
              className="flex-1 bg-white border border-[#c6c5d2] rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#000d5f]"
            />
            <button
              onClick={handleAddAnnotation}
              className="bg-[#000d5f] text-white text-xs px-3 py-1.5 rounded font-mono font-bold"
            >
              저장
            </button>
            <button
              onClick={() => setShowAnnotationInput(false)}
              className="text-xs text-[#454651] px-2 py-1.5"
            >
              취소
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="h-16 bg-white border-t border-[#c6c5d2] flex items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ba1a1a]"></span>
              <span className="text-xs font-semibold text-[#191c1e]">치명적 위반 ({errorItem.severity})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
              <span className="text-xs text-[#454651]">표준 경고</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAnnotationInput(true)}
              className="px-4 py-2 border border-[#c6c5d2] rounded text-xs font-mono font-medium hover:bg-[#f2f4f6] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              주석 추가
            </button>

            <button
              onClick={handleApprove}
              disabled={isApproved}
              className={`px-5 py-2 rounded text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isApproved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#000d5f] text-white hover:opacity-90'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {isApproved ? '수정안 승인됨' : '수정안 승인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
