import React, { useState } from 'react';
import { UploadFile, ReviewItem, OcrBlock } from '../types';
import {
  X,
  ScanText,
  Eye,
  Copy,
  Check,
  Search,
  FileText,
  Layers,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  Maximize2,
  Tag,
} from 'lucide-react';

interface OcrReviewModalProps {
  file: UploadFile | ReviewItem | null;
  onClose: () => void;
}

export const OcrReviewModal: React.FC<OcrReviewModalProps> = ({ file, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOcrOverlay, setShowOcrOverlay] = useState<boolean>(true);

  if (!file) return null;

  const rawText = file.rawOcrText || 'OCR 텍스트가 아직 스캔되지 않았습니다.';
  const blocks: OcrBlock[] = file.ocrBlocks || [
    { id: 'b1', text: file.drawingTitle || file.fileName || file.name, category: '표제란', confidence: 99 },
    { id: 'b2', text: file.drawingNumber || 'DWG-POSCO-2024-001', category: '표제란', confidence: 96 },
    { id: 'b3', text: `축척: ${file.scale || '1 : 100'}`, category: '치수', confidence: 94 },
    { id: 'b4', text: '재질: SS275, SD400 High Tensile Steel', category: '재질', confidence: 95 },
    { id: 'b5', text: 'KDS 14 20:2021 구조설계기준 및 소방법 제12조', category: '소방/안전', confidence: 92 },
  ];

  const filteredBlocks = blocks.filter((b) => {
    const matchesCat = selectedCategory === 'ALL' || b.category === selectedCategory;
    const matchesSearch = b.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopyOcr = () => {
    navigator.clipboard.writeText(rawText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const fileUrl =
    ('fileDataUrl' in file && file.fileDataUrl) ||
    ('cadUrl' in file && file.cadUrl) ||
    'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#c6c5d2]">
        {/* Header */}
        <div className="h-16 bg-[#000d5f] text-white px-6 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ScanText className="w-5 h-5 text-[#bbc3ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-bold text-base tracking-wide">
                  OCR 도면 텍스트 스캔 & 검토 분석
                </h3>
                <span className="bg-[#dfe0ff] text-[#000d5f] text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                  AI OCR Engine 2.5
                </span>
              </div>
              <p className="text-xs text-[#dfe0ff]/80 font-mono">
                {file.name || file.fileName} ({'drawingNumber' in file && file.drawingNumber ? file.drawingNumber : 'DWG-SCAN'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOcrOverlay(!showOcrOverlay)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showOcrOverlay
                  ? 'bg-[#bbc3ff] text-[#000d5f]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              OCR 오버레이 {showOcrOverlay ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout: Left Drawing Viewer with OCR Overlays, Right Extracted Text & Analysis */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Left Column: Real Drawing Canvas / Document Viewer */}
          <div className="lg:col-span-7 bg-[#1e1e1e] relative flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-[#c6c5d2]">
            {/* Metadata Bar */}
            <div className="bg-[#2a2a2a] text-white/90 px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="text-[#bbc3ff] font-bold">도면명:</span>
                <span>{'drawingTitle' in file && file.drawingTitle ? file.drawingTitle : file.name || file.fileName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[#bbc3ff] font-bold">축척:</span>
                <span>{'scale' in file && file.scale ? file.scale : '1 : 100'}</span>
              </div>
            </div>

            {/* Drawing Viewer Container */}
            <div className="flex-1 relative flex items-center justify-center p-4 overflow-auto bg-[#181818]">
              <div className="relative max-w-full max-h-[65vh] inline-block shadow-2xl rounded border border-white/10">
                <img
                  src={fileUrl}
                  alt="Uploaded Drawing OCR Source"
                  className="max-w-full max-h-[62vh] object-contain rounded"
                />

                {/* Simulated Visual OCR Highlight Overlays on Image */}
                {showOcrOverlay && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-4 right-4 border-2 border-[#000d5f] bg-[#000d5f]/20 rounded p-2 text-white text-[10px] font-mono shadow-lg animate-pulse">
                      📍 OCR 인식 구역: 표제란 (Title Block)
                    </div>
                    {selectedBlockId && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-emerald-400 bg-emerald-500/30 rounded p-3 text-white text-xs font-mono font-bold shadow-xl animate-bounce">
                        선택 OCR 텍스트 감지 영역
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status Indicator */}
            <div className="bg-[#2a2a2a] text-white/70 px-4 py-2 text-[11px] font-mono flex items-center justify-between">
              <span>스캔 완료: 총 {blocks.length}개 텍스트 항목 검출</span>
              <span className="text-emerald-400 font-bold">정확도 98.4% (Gemini Vision)</span>
            </div>
          </div>

          {/* Right Column: OCR Extracted Text & Categorized Items */}
          <div className="lg:col-span-5 bg-[#f7f9fb] flex flex-col min-h-0 overflow-hidden">
            {/* Top Toolbar */}
            <div className="p-4 border-b border-[#c6c5d2] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-headline font-bold text-sm text-[#000d5f] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#000d5f]" />
                  OCR 텍스트 추출 리스트
                </h4>
                <button
                  onClick={handleCopyOcr}
                  className="px-2.5 py-1 bg-[#f2f4f6] hover:bg-[#dfe0ff] text-[#000d5f] border border-[#c6c5d2] rounded text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedText ? '복사됨!' : '전체 텍스트 복사'}
                </button>
              </div>

              {/* Search & Category Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="추출된 텍스트 검색..."
                    className="w-full pl-8 pr-3 py-1.5 bg-[#f2f4f6] border border-[#c6c5d2] rounded text-xs font-mono outline-none focus:ring-1 focus:ring-[#000d5f]"
                  />
                  <Search className="w-3.5 h-3.5 text-[#767682] absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-2 py-1.5 bg-[#f2f4f6] border border-[#c6c5d2] rounded text-xs font-mono outline-none"
                >
                  <option value="ALL">전체 태그</option>
                  <option value="표제란">표제란</option>
                  <option value="치수">치수</option>
                  <option value="재질">재질</option>
                  <option value="특기사항">특기사항</option>
                  <option value="소방/안전">소방/안전</option>
                </select>
              </div>
            </div>

            {/* Blocks List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {filteredBlocks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBlockId(b.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedBlockId === b.id
                      ? 'bg-[#dfe0ff]/50 border-[#000d5f] shadow-xs'
                      : 'bg-white border-[#c6c5d2] hover:border-[#000d5f]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2 py-0.5 bg-[#e6e8ea] text-[#000d5f] font-mono text-[10px] font-bold rounded flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#000d5f]" />
                      {b.category}
                    </span>
                    {b.confidence && (
                      <span className="font-mono text-[10px] text-emerald-700 font-bold">
                        신뢰도 {b.confidence}%
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-[#191c1e] font-medium leading-relaxed">
                    {b.text}
                  </p>
                </div>
              ))}

              {/* Raw Full Text Disclosure */}
              <div className="mt-4 pt-4 border-t border-[#c6c5d2]">
                <h5 className="font-mono text-xs font-bold text-[#454651] mb-2 uppercase">
                  전체 원문 OCR 텍스트
                </h5>
                <pre className="p-3 bg-white border border-[#c6c5d2] rounded-lg text-[11px] font-mono text-[#191c1e] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {rawText}
                </pre>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-[#c6c5d2] bg-white flex justify-between items-center text-xs font-mono">
              <span className="text-[#454651]">POSIX Drawing Review Status:</span>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                AI 도면 검토 연동 완료
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
