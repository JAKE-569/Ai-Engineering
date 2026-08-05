import React, { useState } from 'react';
import { UploadFile, ReviewItem, DesignErrorItem, DocCategory, TradeCategory } from '../types';
import { DrawingCanvasPreview } from './DrawingCanvasPreview';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  ScanText,
  MapPin,
  Sparkles,
  CheckCircle2,
  Printer,
  Layers,
  Wrench,
  BookOpen,
} from 'lucide-react';

interface PdfViewerModalProps {
  file: UploadFile | ReviewItem | DesignErrorItem | any | null;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ file, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 4; // Simulated multi-page PDF document
  const [showOcrPanel, setShowOcrPanel] = useState<boolean>(true);
  const [showMarkups, setShowMarkups] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ocr' | 'markups' | 've'>('ocr');

  if (!file) return null;

  const fileName = 'fileName' in file ? file.fileName : ('dwgFile' in file ? file.dwgFile : file.name || '도면.pdf');
  const fileDataUrl = file.fileDataUrl || ('cadUrl' in file ? file.cadUrl : undefined);
  const docCategory: DocCategory = file.docCategory || '도면';
  const tradeCategory: TradeCategory = file.tradeCategory || '소방';
  const drawingTitle = ('drawingTitle' in file && file.drawingTitle) || fileName;
  const drawingNumber = ('drawingNumber' in file && file.drawingNumber) || `PDF-DWG-${tradeCategory.substring(0,2).toUpperCase()}-2024-001`;

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const handleDownload = () => {
    if (fileDataUrl) {
      const a = document.createElement('a');
      a.href = fileDataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`[${fileName}] PDF 문서 다운로드를 시작합니다.`);
    }
  };

  const isRealPdf = fileDataUrl && (fileDataUrl.includes('application/pdf') || fileDataUrl.includes('data:application/pdf'));

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="bg-[#0e1424] text-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/10">
        {/* PDF Header Bar */}
        <div className="bg-[#050914] px-6 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{fileName}</span>
                <span className="bg-[#000d5f] text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20 whitespace-nowrap inline-block">
                  {docCategory}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap inline-block ${
                    tradeCategory === '토목'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : tradeCategory === '건축'
                      ? 'bg-blue-950 text-blue-300 border-blue-700'
                      : tradeCategory === '건축기계'
                      ? 'bg-teal-950 text-teal-300 border-teal-700'
                      : tradeCategory === '건축전기'
                      ? 'bg-purple-950 text-purple-300 border-purple-700'
                      : 'bg-red-950 text-red-300 border-red-700'
                  }`}
                >
                  {tradeCategory}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-sans mt-0.5">
                {drawingTitle} | 도면번호: {drawingNumber}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="이전 페이지"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] px-2 font-bold text-emerald-400 whitespace-nowrap">
                {currentPage} / {totalPages} Page
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 hover:bg-white/10 rounded disabled:opacity-30 cursor-pointer"
                title="다음 페이지"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1">
              <button onClick={handleZoomOut} className="p-1 hover:bg-white/10 rounded cursor-pointer" title="축소">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-bold text-gray-300 w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button onClick={handleZoomIn} className="p-1 hover:bg-white/10 rounded cursor-pointer" title="확대">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={handleResetZoom} className="p-1 hover:bg-white/10 rounded cursor-pointer" title="기본">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Side Panel Toggle */}
            <button
              onClick={() => setShowOcrPanel(!showOcrPanel)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                showOcrPanel
                  ? 'bg-blue-600 text-white border-blue-400 shadow'
                  : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
              }`}
            >
              <ScanText className="w-4 h-4" />
              OCR & 분석 패널
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              PDF 다운로드
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left/Center Canvas: PDF Viewer Stage */}
          <div className="flex-1 bg-[#151d2f] overflow-hidden p-3 md:p-5 flex flex-col items-center justify-center relative select-none">
            <div
              className="transition-transform duration-150 ease-out flex flex-col items-center w-full h-full"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
            >
              <DrawingCanvasPreview
                fileDataUrl={fileDataUrl}
                drawingTitle={drawingTitle}
                drawingNumber={drawingNumber}
                docCategory={docCategory}
                tradeCategory={tradeCategory}
                scale="1 : 100"
                fileName={fileName}
                ocrBlocks={'ocrBlocks' in file ? file.ocrBlocks : undefined}
                markups={'markups' in file ? file.markups : undefined}
                className="w-full h-full min-h-[580px]"
                maxHeight="100%"
              />
            </div>
          </div>

          {/* Right Side Panel: OCR Text / Review Findings / VE Suggestions */}
          {showOcrPanel && (
            <div className="w-80 md:w-96 bg-[#090e1a] border-l border-white/10 flex flex-col text-xs font-sans">
              {/* Panel Tabs */}
              <div className="flex border-b border-white/10 bg-[#050914] text-gray-400">
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`flex-1 py-3 text-center font-mono font-bold flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
                    activeTab === 'ocr' ? 'border-blue-500 text-blue-400 bg-white/5' : 'border-transparent hover:text-white'
                  }`}
                >
                  <ScanText className="w-3.5 h-3.5" />
                  OCR 텍스트
                </button>
                <button
                  onClick={() => setActiveTab('markups')}
                  className={`flex-1 py-3 text-center font-mono font-bold flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
                    activeTab === 'markups' ? 'border-red-500 text-red-400 bg-white/5' : 'border-transparent hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  검토 마크업
                </button>
                <button
                  onClick={() => setActiveTab('ve')}
                  className={`flex-1 py-3 text-center font-mono font-bold flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
                    activeTab === 've' ? 'border-emerald-500 text-emerald-400 bg-white/5' : 'border-transparent hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  VE 절감안
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === 'ocr' && (
                  <div className="space-y-3 font-mono">
                    <div className="bg-[#121a2d] p-3 rounded-lg border border-white/10">
                      <span className="text-blue-400 font-bold block mb-1">📄 PDF OCR 추출 정보</span>
                      <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {'rawOcrText' in file && file.rawOcrText
                          ? file.rawOcrText
                          : `[PDF OCR 추출 완료]\n문서명: ${fileName}\n도서구분: ${docCategory}\n공종: ${tradeCategory}\n페이지: 1 ~ 4페이지\n축척: 1:100\n표제란 및 기술사양 인지 완료.`}
                      </p>
                    </div>

                    {'ocrBlocks' in file && file.ocrBlocks && file.ocrBlocks.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-gray-400 font-bold text-[11px]">검출된 레이블 블록</span>
                        {file.ocrBlocks.map((b, idx) => (
                          <div key={idx} className="bg-[#121a2d] p-2.5 rounded border border-white/5 flex justify-between items-center text-[11px]">
                            <span className="text-gray-200">{b.text}</span>
                            <span className="bg-blue-900/60 text-blue-300 px-1.5 py-0.5 rounded text-[9px]">
                              {b.category} ({b.confidence || 95}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'markups' && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center justify-between text-gray-300">
                      <span className="font-bold text-red-400">지적 및 보정 마크업 리스트</span>
                      <button
                        onClick={() => setShowMarkups(!showMarkups)}
                        className="text-[10px] bg-white/10 px-2 py-0.5 rounded hover:bg-white/20"
                      >
                        {showMarkups ? '마크업 숨기기' : '마크업 표시'}
                      </button>
                    </div>

                    <div className="bg-red-950/40 border border-red-500/30 p-3 rounded-lg space-y-2 text-red-200 text-[11px]">
                      <div className="flex justify-between items-center font-bold">
                        <span>📌 [1] {tradeCategory} 기술기준 지적</span>
                        <span className="bg-red-600 text-white px-1.5 py-0.2 rounded text-[9px] font-mono">CRITICAL</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">
                        {tradeCategory} 관련 한국엔지니어링 기술기준 세부 규격 미달. 관로 직경 및 연결 부속 단가 산출서 확인 요청.
                      </p>
                    </div>

                    <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-lg space-y-2 text-amber-200 text-[11px]">
                      <div className="flex justify-between items-center font-bold">
                        <span>📌 [2] 수량 및 시공성 재확인</span>
                        <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded text-[9px] font-mono">WARNING</span>
                      </div>
                      <p className="text-gray-300 leading-relaxed">
                        도면 표제란 규격과 산출 내역서 간 수량 불일치 지적. 표준품셈 적용 여부 확인 필요.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 've' && (
                  <div className="space-y-3 font-sans">
                    <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg space-y-2 text-emerald-200 text-[11px]">
                      <span className="font-bold text-emerald-300 block">💡 PDF 도서 기반 VE 추천</span>
                      <p className="text-gray-200 leading-relaxed">
                        [{tradeCategory}] 자재 규격 최적화 및 동선 단축을 통한 예상 공사비 절감안
                      </p>
                      <div className="border-t border-emerald-500/20 pt-2 flex justify-between items-center font-mono">
                        <span className="text-gray-400">예상 절감 금액:</span>
                        <span className="text-emerald-300 font-bold text-sm">₩ 45,000,000</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer */}
              <div className="p-3 bg-[#050914] border-t border-white/10 text-center">
                <span className="text-[10px] text-gray-500 font-mono">
                  POSCO AI PDF ENGINE ACTIVE | KDS / KEC / NFTC
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
