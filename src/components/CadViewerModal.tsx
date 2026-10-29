import React, { useState } from 'react';
import { DesignErrorItem } from '../types';
import { X, ZoomIn, ZoomOut, Move, CheckCircle, MessageSquare } from 'lucide-react';
import { DrawingCanvasPreview } from './DrawingCanvasPreview';

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
              PDF 도면 검토 뷰어 - {errorItem.dwgFile}
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
        <div className="flex-1 bg-[#0a111e] relative overflow-hidden flex flex-col items-center justify-center p-3 select-none">
          {/* Blueprint Image & Interactive CAD Stage */}
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded">
              <DrawingCanvasPreview
              previewPages={errorItem.previewPages}
              fileDataUrl={errorItem.fileDataUrl}
              cadUrl={errorItem.cadUrl}
              drawingTitle={errorItem.drawingTitle || errorItem.dwgFile}
              drawingNumber={errorItem.errorCode}
              fileName={errorItem.dwgFile}
              docCategory={errorItem.docCategory || '도면'}
              tradeCategory={errorItem.tradeCategory || '소방'}
              ocrBlocks={errorItem.ocrBlocks}
              markups={errorItem.markups}
              highlightError={{
                errorCode: errorItem.errorCode,
                description: errorItem.description,
                codeClause: errorItem.suggestedFix,
              }}
              className="w-full h-full"
              maxHeight="72vh"
            />
          </div>

          {/* Annotations List */}
          {annotations.length > 0 && (
            <div className="absolute top-16 right-6 bg-black/85 backdrop-blur-md text-white p-3 rounded-xl max-w-xs border border-white/20 text-xs shadow-2xl z-30">
              <p className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                엔지니어 보정 주석 ({annotations.length})
              </p>
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
