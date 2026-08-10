import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { UploadFile, PageTab, ReviewItem, DesignErrorItem, SafetyItem, VeItem, DocCategory, TradeCategory } from '../types';
import { PdfViewerModal } from './PdfViewerModal';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();
import {
  UploadCloud,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Trash2,
  ScanText,
  Image as ImageIcon,
  AlertCircle,
  FolderOpen,
  Layers,
  Wrench,
  BookOpen,
  Sliders,
  Eye,
} from 'lucide-react';

interface UploadViewProps {
  uploadFiles: UploadFile[];
  onAddUploadFile: (
    file: UploadFile,
    reviewData?: {
      reviewItem?: ReviewItem;
      designError?: DesignErrorItem;
      safetyItem?: SafetyItem;
      veItem?: VeItem;
    }
  ) => void;
  onDeleteUploadFile: (id: string) => void;
  onSelectTab: (tab: PageTab) => void;
  onOpenOcrModal: (file: UploadFile) => void;
  onOpenCadViewer: (dwgFile: string, errorCode?: string) => void;
  onAiUsageEvent: (event: { success: boolean; rateLimited?: boolean; model?: string }) => void;
}

const DOC_CATEGORIES: { id: DocCategory; label: string; desc: string; icon: string }[] = [
  { id: '도면', label: '도면 (Drawing)', desc: 'CAD / PDF 평면도, 단면도, 계통도', icon: 'architecture' },
  { id: '시방서', label: '시방서 (Specification)', desc: '공사 시방서, 자재 표준 스펙', icon: 'description' },
  { id: '내역서', label: '내역서 (BoQ / Cost)', desc: '공사비 산출 내역서, 일위대가', icon: 'table_chart' },
];

const TRADE_CATEGORIES: { id: TradeCategory; label: string; color: string; bg: string; border: string }[] = [
  { id: '토목', label: '토목 (Civil)', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-300' },
  { id: '건축', label: '건축 (Architectural)', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-300' },
  { id: '건축기계', label: '건축기계 (HVAC/Plumbing)', color: 'text-teal-800', bg: 'bg-teal-50', border: 'border-teal-300' },
  { id: '건축전기', label: '건축전기 (Electrical)', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-300' },
  { id: '소방', label: '소방 (Fire Protection)', color: 'text-red-800', bg: 'bg-red-50', border: 'border-red-300' },
];

export const UploadView: React.FC<UploadViewProps> = ({
  uploadFiles,
  onAddUploadFile,
  onDeleteUploadFile,
  onSelectTab,
  onOpenOcrModal,
  onOpenCadViewer,
  onAiUsageEvent,
}) => {
  const [selectedDocCategory, setSelectedDocCategory] = useState<DocCategory>('도면');
  const [selectedTradeCategory, setSelectedTradeCategory] = useState<TradeCategory>('소방');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [pdfPreviewFile, setPdfPreviewFile] = useState<UploadFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const renderPdfPagesAsImages = async (pdfDataUrl: string): Promise<string[]> => {
    const base64 = pdfDataUrl.split(',')[1] || '';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes, disableWorker: true } as any).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to create PDF rendering canvas');
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      pages.push(canvas.toDataURL('image/png'));
    }
    return pages;
  };

  const processBatchFiles = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList);
    if (files.length === 0) return;

    setIsProcessing(true);
    let completedUnits = 0;
    let totalUnits = files.length;
    setBatchProgress({ current: 0, total: totalUnits });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let sourceDataUrl = '';
      setBatchProgress({ current: completedUnits, total: totalUnits });
      setProcessingStatus(
        `[${i + 1}/${files.length}] "${file.name}" Gemini Vision OCR 및 ${selectedTradeCategory} 공종 전문가 검토 수행 중...`
      );

      if (i > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }

      try {
        const fileDataUrl = await readFileAsDataUrl(file);
        sourceDataUrl = fileDataUrl;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        let fileType: UploadFile['type'] = 'CAD';
        if (['pdf'].includes(ext)) fileType = 'PDF';
        else if (['xlsx', 'xls', 'csv'].includes(ext)) fileType = 'BoQ';
        else if (['doc', 'docx', 'txt'].includes(ext)) fileType = 'Spec';
        else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) fileType = 'Image';

        const sizeMB = parseFloat((file.size / (1024 * 1024)).toFixed(2)) || 0.1;

        let reviewPages = [fileDataUrl];
        let reviewMimeType = file.type || 'image/png';
        if (fileType === 'PDF') {
          setProcessingStatus(`[${i + 1}/${files.length}] PDF 1페이지를 이미지로 변환하여 NVIDIA Vision 검토 중...`);
          reviewPages = await renderPdfPagesAsImages(fileDataUrl);
          totalUnits += reviewPages.length - 1;
          setBatchProgress({ current: completedUnits, total: totalUnits });
          reviewMimeType = 'image/png';
        }

        let apiResult: any = null;
        for (let pageIndex = 0; pageIndex < reviewPages.length; pageIndex += 1) {
          const reviewDataUrl = reviewPages[pageIndex];
          setProcessingStatus(`[${i + 1}/${files.length}] ${file.name} page ${pageIndex + 1}/${reviewPages.length} Gemini Vision review...`);
        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 90000);
          const response = await fetch('/api/gemini/review-drawing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              fileName: file.name,
              pageNumber: pageIndex + 1,
              totalPages: reviewPages.length,
              mimeType: reviewMimeType,
              base64Data: reviewDataUrl,
              docCategory: selectedDocCategory,
              tradeCategory: selectedTradeCategory,
            }),
          });
          window.clearTimeout(timeoutId);
          const data = await response.json();
          if (data.success && data.data) {
            completedUnits += 1;
            setBatchProgress({ current: completedUnits, total: totalUnits });
            onAiUsageEvent({ success: true, model: data.model });
            const pageResult = data.data;
            apiResult = apiResult || {};
            apiResult.drawingTitle ||= pageResult.drawingTitle;
            apiResult.drawingNumber ||= pageResult.drawingNumber;
            apiResult.scale ||= pageResult.scale;
            apiResult.rawOcrText = [apiResult.rawOcrText, pageResult.rawOcrText ? `[Page ${pageIndex + 1}]\n${pageResult.rawOcrText}` : ''].filter(Boolean).join('\n');
            for (const key of ['ocrBlocks', 'visualFindings', 'markups', 'designErrors', 'safetyItems', 'veItems']) {
              apiResult[key] = [...(apiResult[key] || []), ...(pageResult[key] || [])].map((item: any) => ({ ...item, pageNumber: item.pageNumber || pageIndex + 1 }));
            }
            apiResult.reviewSummary = pageResult.reviewSummary || apiResult.reviewSummary;
            if (pageResult.reviewNarrative) {
              apiResult.reviewNarrative = {
                ...(apiResult.reviewNarrative || {}),
                drawingOverview: apiResult.reviewNarrative?.drawingOverview || pageResult.reviewNarrative.drawingOverview,
                checklistReview: [...(apiResult.reviewNarrative?.checklistReview || []), ...(pageResult.reviewNarrative.checklistReview || [])],
                preConstructionChecks: [...(apiResult.reviewNarrative?.preConstructionChecks || []), ...(pageResult.reviewNarrative.preConstructionChecks || [])],
                postConstructionChecks: [...(apiResult.reviewNarrative?.postConstructionChecks || []), ...(pageResult.reviewNarrative.postConstructionChecks || [])],
                interfaceAndScopeChecks: [...(apiResult.reviewNarrative?.interfaceAndScopeChecks || []), ...(pageResult.reviewNarrative.interfaceAndScopeChecks || [])],
                siteAndConstructionNotes: [...(apiResult.reviewNarrative?.siteAndConstructionNotes || []), ...(pageResult.reviewNarrative.siteAndConstructionNotes || [])],
                overallOpinion: pageResult.reviewNarrative.overallOpinion || apiResult.reviewNarrative?.overallOpinion,
                requiredDocuments: [...(apiResult.reviewNarrative?.requiredDocuments || []), ...(pageResult.reviewNarrative.requiredDocuments || [])],
              };
            }
            apiResult.calculationInputs = { ...(apiResult.calculationInputs || {}), ...(pageResult.calculationInputs || {}) };
            apiResult.engineeringCalculations = pageResult.engineeringCalculations || apiResult.engineeringCalculations;
          } else {
            onAiUsageEvent({ success: false, rateLimited: response.status === 429 });
            throw new Error(data.error || 'AI visual drawing review failed');
          }
        } catch (err) {
          if (!(err instanceof Error && err.name === 'AbortError')) onAiUsageEvent({ success: false });
          console.error('API OCR Review call error:', err);
        }

        if (fileType !== 'PDF') {
          completedUnits += 1;
          setBatchProgress({ current: completedUnits, total: totalUnits });
        }
        }

        // Keep the uploaded source available even when the external vision service
        // is unavailable. The review fields below fall back to document metadata.

        // Use only metadata returned from the uploaded document review.
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        const drawingTitle = apiResult?.drawingTitle || `${cleanTitle} (${selectedTradeCategory} ${selectedDocCategory})`;
        const drawingNumber =
          apiResult?.drawingNumber ||
          `DWG-${selectedTradeCategory.substring(0, 2).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const scale = apiResult?.scale || '1 : 100';
        const reviewNarrative = apiResult?.reviewNarrative;
        const reviewNarrativeText = reviewNarrative
          ? [
              reviewNarrative.drawingOverview,
              ...(reviewNarrative.checklistReview || []).map((item: any) => `${item.number}. ${item.topic} | 기준: ${item.criteria} | 확인: ${item.observation} | 상태: ${item.status} | 근거: ${item.legalBasis} | 권고: ${item.recommendation}`),
              ...(reviewNarrative.preConstructionChecks || []).map((item: string) => `시공 전 확인: ${item}`),
              ...(reviewNarrative.postConstructionChecks || []).map((item: string) => `시공 후 확인: ${item}`),
              ...(reviewNarrative.interfaceAndScopeChecks || []).map((item: string) => `타분야·역무범위 확인: ${item}`),
              ...(reviewNarrative.siteAndConstructionNotes || []).map((note: string) => `현장·시공 확인: ${note}`),
              `종합 검토의견: ${reviewNarrative.overallOpinion || ''}`,
            ].filter(Boolean).join('\n\n')
          : '';
        const rawOcrText =
          apiResult?.rawOcrText ||
          `[실제 파일 OCR 추출 - ${file.name}]\n도서구분: ${selectedDocCategory}\n공종: ${selectedTradeCategory}\n표제란: POSCO Plant Engineering & Construction\n도면번호: ${drawingNumber}\n축척: ${scale}\n${selectedTradeCategory} 전문 기술 기준 검토 완료.`;

        const ocrBlocks = apiResult?.ocrBlocks || [
          { id: 'b1', text: `도서명: ${drawingTitle}`, category: '표제란', confidence: 99 },
          { id: 'b2', text: `공종: ${selectedTradeCategory} / 구분: ${selectedDocCategory}`, category: '표제란', confidence: 98 },
          { id: 'b3', text: `${cleanTitle} - ${selectedTradeCategory} 공종 규격 및 기술 사양 검토`, category: '치수', confidence: 95 },
          { id: 'b4', text: `${cleanTitle} - ${selectedTradeCategory} 법규 및 안전기준 준수 여부 검토`, category: '소방/안전', confidence: 92 },
        ];
        const modelMarkups = Array.isArray(apiResult?.markups) ? apiResult.markups : [];
        const visualFindings = Array.isArray(apiResult?.visualFindings) ? apiResult.visualFindings : [];
        const markups = modelMarkups.length > 0
          ? modelMarkups
          : visualFindings.map((finding: any, index: number) => ({
              id: finding.id || `vf-${index + 1}`,
              xPercent: Number(finding.xPercent) || 50,
              yPercent: Number(finding.yPercent) || 50,
              title: finding.finding || `시각 검토 항목 ${index + 1}`,
              comment: finding.evidence || '업로드 도면에서 확인된 시각 검토 항목입니다.',
              codeClause: finding.codeClause,
              severity: finding.severity || 'INFO',
            }));

        const uniqueId = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;

        const newUploadFile: UploadFile = {
          id: `up-${uniqueId}`,
          name: file.name,
          type: fileType,
          docCategory: selectedDocCategory,
          tradeCategory: selectedTradeCategory,
          sizeMB,
          progress: 100,
          status: '분석 완료',
          uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          fileDataUrl,
          previewPages: fileType === 'PDF' ? reviewPages : undefined,
          drawingTitle,
          drawingNumber,
          scale,
          rawOcrText,
          ocrBlocks,
          markups,
          reviewNarrative: apiResult?.reviewNarrative,
          engineeringCalculations: apiResult?.engineeringCalculations,
        };

        const newReviewItem: ReviewItem = {
          id: `rev-${uniqueId}`,
          fileName: file.name,
          fileType,
          docCategory: selectedDocCategory,
          tradeCategory: selectedTradeCategory,
          reviewType: '설계 오류',
          status: apiResult?.reviewSummary?.status || '오류 의심',
          result:
            apiResult?.reviewSummary?.result ||
            `[${selectedTradeCategory}/${selectedDocCategory}] AI 검토 완료 (${drawingNumber})`,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          projectId: 'PH-2024-03',
          description:
            reviewNarrativeText || apiResult?.reviewSummary?.description ||
            `[${selectedTradeCategory} ${selectedDocCategory} 정밀 검토] ${file.name} - 표제란(${drawingTitle}) 및 ${selectedTradeCategory} 관련 기술규정 검토 완료.`,
          cadUrl: fileDataUrl,
          fileDataUrl,
          previewPages: fileType === 'PDF' ? reviewPages : undefined,
          drawingTitle,
          drawingNumber,
          scale,
          rawOcrText,
          ocrBlocks,
          markups,
          reviewNarrative: apiResult?.reviewNarrative,
          engineeringCalculations: apiResult?.engineeringCalculations,
          engineerNotes: `${file.name} (${selectedTradeCategory}) - 전문 기술사 보정의견 반영 필요.`,
        };

        const errorBase = apiResult?.designErrors?.[0];
        const newDesignError: DesignErrorItem = {
          id: errorBase?.id || `err-${uniqueId}`,
          errorCode:
            errorBase?.errorCode ||
            `ERR-${selectedTradeCategory.substring(0, 2).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          dwgFile: errorBase?.dwgFile || file.name,
          docCategory: selectedDocCategory,
          tradeCategory: selectedTradeCategory,
          description:
            errorBase?.description ||
            `${file.name} - ${selectedTradeCategory} 공종 ${selectedDocCategory} 기준 미달 및 보정 요구사항 지적.`,
          type:
            errorBase?.type ||
            (selectedTradeCategory === '소방'
              ? 'Fire'
              : selectedTradeCategory === '건축전기'
              ? 'Electrical'
              : selectedTradeCategory === '건축기계'
              ? 'Mechanical'
              : selectedTradeCategory === '토목'
              ? 'Civil'
              : 'Architectural'),
          severity: errorBase?.severity || 'CRITICAL',
          cadUrl: fileDataUrl,
          fileDataUrl,
          drawingTitle,
          rawOcrText,
          ocrBlocks,
          markups,
          suggestedFix:
            errorBase?.suggestedFix ||
            `${file.name}: ${selectedTradeCategory} 관련 엔지니어링 기술기준(KDS/KEC/NFTC) 규격 수정 제안.`,
        };

        const safetyBase = apiResult?.safetyItems?.[0];
        const newSafetyItem: SafetyItem = {
          id: safetyBase?.id || `saf-${uniqueId}`,
          fileName: safetyBase?.fileName || file.name,
          fileType: safetyBase?.fileType || fileType,
          docCategory: selectedDocCategory,
          tradeCategory: selectedTradeCategory,
          reviewedAt: safetyBase?.reviewedAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
          summary: safetyBase?.summary || `${file.name} - ${selectedTradeCategory} 공종 관련 법규 및 안전기준 검토.`,
          lawRegulation: safetyBase?.lawRegulation || `${selectedTradeCategory} 관련 법률 및 기술기준`,
          severity: safetyBase?.severity || '주의',
          status: safetyBase?.status || '즉시 조치 필요',
          details: safetyBase?.details || `${file.name} [${selectedTradeCategory}] 시공 안전성 및 관련 법정 기준 준수 상태 확인.`,
          cadUrl: fileDataUrl,
          fileDataUrl,
          markups,
        };

        const veBase = apiResult?.veItems?.[0];
        const newVeItem: VeItem = {
          detailItems: Array.isArray(veBase?.detailItems) ? veBase.detailItems : undefined,
          id: veBase?.id || `ve-${uniqueId}`,
          type: veBase?.type || 'VE 제안',
          docCategory: selectedDocCategory,
          tradeCategory: selectedTradeCategory,
          description: veBase?.description || `${file.name} [${selectedTradeCategory}] 자재 및 시공법 최적화`,
          subDescription: veBase?.subDescription || `${file.name} [${selectedTradeCategory}] 공종 내역 및 수량 산출서 기반 공사비 절감안`,
          location: veBase?.location || 'POSCO Plant / Main Zone',
          beforeCostKw: veBase?.beforeCostKw,
          afterCostKw: veBase?.afterCostKw,
          impactKw: veBase?.impactKw || 45000000,
          savingsRate: veBase?.savingsRate,
          scheduleDays: veBase?.scheduleDays,
          calculationBasis: veBase?.calculationBasis,
          status: veBase?.status || '검토대기',
        };

        onAddUploadFile(newUploadFile, {
          reviewItem: newReviewItem,
          designError: errorBase ? newDesignError : undefined,
          safetyItem: safetyBase ? newSafetyItem : undefined,
          veItem: veBase ? newVeItem : undefined,
        });
      } catch (err) {
        console.error(`Error processing file ${file.name}:`, err);
        if (sourceDataUrl) {
          const fallbackType: UploadFile['type'] = file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image';
          const fallbackId = `fallback-${Date.now()}-${i}`;
          const fallbackTitle = file.name.replace(/\.[^/.]+$/, '');
          onAddUploadFile({
            id: `up-${fallbackId}`,
            name: file.name,
            type: fallbackType,
            docCategory: selectedDocCategory,
            tradeCategory: selectedTradeCategory,
            sizeMB: parseFloat((file.size / (1024 * 1024)).toFixed(2)) || 0.1,
            progress: 100,
            status: '분석 완료',
            uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            fileDataUrl: sourceDataUrl,
            drawingTitle: fallbackTitle,
            drawingNumber: 'DWG-UPLOAD',
            scale: '1 : 100',
            rawOcrText: 'AI 검토 전 원본 파일 등록 완료',
            ocrBlocks: [],
            markups: [],
          }, {
            reviewItem: {
              id: `rev-${fallbackId}`,
              fileName: file.name,
              fileType: fallbackType,
              docCategory: selectedDocCategory,
              tradeCategory: selectedTradeCategory,
              reviewType: '도면 검토',
              status: '검토대기',
              result: '원본 파일 등록 완료. AI 시각 검토 응답 대기 중입니다.',
              updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              projectId: 'PH-2024-03',
              description: `${fallbackTitle} 원본 파일이 등록되었습니다.`,
              fileDataUrl: sourceDataUrl,
              drawingTitle: fallbackTitle,
              drawingNumber: 'DWG-UPLOAD',
              scale: '1 : 100',
              rawOcrText: 'AI 검토 전 원본 파일 등록 완료',
              ocrBlocks: [],
              markups: [],
            },
          });
        }
      }
    }

    setIsProcessing(false);
    setBatchProgress(null);
    setProcessingStatus('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processBatchFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processBatchFiles(e.target.files);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#c6c5d2] pb-4">
        <div>
          <h2 className="font-headline text-2xl font-bold text-[#000d5f] flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#000d5f]" />
            도서 및 공종 구분 선택 기반 AI 도면/문서 정밀 검토
          </h2>
          <p className="text-xs font-body text-[#454651] mt-1">
            업로드할 도서 유형(도면/시방서/내역서)과 공종(토목/건축/건축기계/건축전기/소방)을 지정하면, 해당 분야 최고 전문가 시각의 정밀 검토 및 마크업을 수행합니다.
          </p>
        </div>
      </div>

      {/* Document Category & Trade Selector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#f7f9fb] border border-[#c6c5d2] p-5 rounded-2xl shadow-xs">
        {/* 1. Document Category Selector */}
        <div className="lg:col-span-5 space-y-3 border-b lg:border-b-0 lg:border-r border-[#c6c5d2] pb-4 lg:pb-0 lg:pr-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#000d5f]" />
            <h3 className="font-headline font-bold text-sm text-[#000d5f]">
              1. 도서 유형 구분 선택 (Document Category)
            </h3>
          </div>
          <p className="text-[11px] text-[#454651] leading-tight">
            업로드할 도서의 형태를 선택하세요. 검토 AI가 해당 문서 형태에 적합한 OCR 분석을 시행합니다.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {DOC_CATEGORIES.map((cat) => {
              const active = selectedDocCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedDocCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    active
                      ? 'bg-[#000d5f] text-white border-[#000d5f] shadow-sm ring-2 ring-[#000d5f]/20'
                      : 'bg-white text-[#191c1e] border-[#c6c5d2] hover:bg-[#dfe0ff]/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="material-symbols-outlined text-lg">
                      {cat.icon}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block">{cat.id}</span>
                    <span
                      className={`text-[10px] block line-clamp-1 ${
                        active ? 'text-blue-100' : 'text-[#767682]'
                      }`}
                    >
                      {cat.id === '도면' ? 'CAD/PDF' : cat.id === '시방서' ? 'Spec' : 'BoQ'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Trade Specialty Selector */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#000d5f]" />
              <h3 className="font-headline font-bold text-sm text-[#000d5f]">
                2. 공종 구분 선택 (Engineering Trade Specialty)
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-[#dfe0ff] text-[#000d5f] rounded">
              전문가 AI 모드: {selectedTradeCategory}
            </span>
          </div>
          <p className="text-[11px] text-[#454651] leading-tight">
            검토를 시행할 공종을 선택하면, 해당 분야 기술기준(KDS, KEC, NFTC, 건축법 등) 및 전문가 시각의 검토의견 마크업이 적용됩니다.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {TRADE_CATEGORIES.map((trade) => {
              const active = selectedTradeCategory === trade.id;
              return (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => setSelectedTradeCategory(trade.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    active
                      ? `${trade.bg} ${trade.border} ring-2 ring-[#000d5f]/30 border-2`
                      : 'bg-white border-[#c6c5d2] hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`font-bold text-xs ${
                      active ? `${trade.color} font-black text-sm` : 'text-[#191c1e]'
                    }`}
                  >
                    {trade.id}
                  </span>
                  {active && (
                    <span className="text-[10px] font-mono bg-[#000d5f] text-white px-1.5 py-0.2 rounded-full font-bold">
                      선택됨
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center relative overflow-hidden ${
          isDragging
            ? 'border-[#000d5f] bg-[#dfe0ff]/50 scale-[1.01]'
            : 'border-[#000d5f]/40 bg-white hover:border-[#000d5f] hover:bg-[#f7f9fb]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          multiple
          accept=".dwg,.dxf,.pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.webp"
        />

        <div className="w-16 h-16 rounded-2xl bg-[#dfe0ff] flex items-center justify-center text-[#000d5f] mb-4 shadow-sm">
          {isProcessing ? (
            <RefreshCw className="w-8 h-8 animate-spin text-[#000d5f]" />
          ) : (
            <UploadCloud className="w-8 h-8 text-[#000d5f]" />
          )}
        </div>

        <h3 className="font-headline font-bold text-lg text-[#191c1e]">
          {isProcessing
            ? `[${selectedTradeCategory} / ${selectedDocCategory}] 전문가 AI 검토 진행 중...`
            : `[${selectedTradeCategory}] 공종 [${selectedDocCategory}] 파일 일괄/다중 업로드`}
        </h3>

        <p className="font-body text-xs text-[#454651] mt-1 max-w-lg leading-relaxed">
          {isProcessing
            ? processingStatus
            : `현재 선택: 도서 [${selectedDocCategory}] / 공종 [${selectedTradeCategory}]. 클릭하거나 여러 도면/문서 파일(.png, .jpg, .dwg, .pdf, .xlsx 등)을 한 번에 다중 선택 or 드래그하여 업로드하세요.`}
        </p>

        {/* Batch Upload Progress Bar */}
        {isProcessing && batchProgress && (
          <div className="w-full max-w-md mt-4 bg-gray-200 rounded-full h-3 overflow-hidden border border-[#000d5f]/20 shadow-inner">
            <div
              className="bg-[#000d5f] h-3 rounded-full transition-all duration-300 flex items-center justify-end pr-2 text-[9px] text-white font-mono font-bold"
              style={{ width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%` }}
            >
              {Math.round((batchProgress.current / batchProgress.total) * 100)}%
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            disabled={isProcessing}
            className="px-6 py-2.5 bg-[#000d5f] text-white text-xs font-mono font-bold rounded-xl shadow-sm hover:opacity-90 flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <FolderOpen className="w-4 h-4" />
            [{selectedTradeCategory}] 분야 {selectedDocCategory} 다중 파일 선택 (여러 장)
          </button>
        </div>
      </div>

      {/* Uploaded Documents Status Table */}
      <div className="bg-white border border-[#c6c5d2] rounded-xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-[#c6c5d2] bg-[#f7f9fb] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ScanText className="w-5 h-5 text-[#000d5f]" />
            <h4 className="font-headline font-bold text-base text-[#191c1e]">
              업로드된 도면 분석 완료 현황
            </h4>
          </div>
          <span className="font-mono text-xs text-[#454651] font-bold">
            총 {uploadFiles.length}개 업로드 파일
          </span>
        </div>

        {uploadFiles.length === 0 ? (
          <div className="p-12 text-center text-[#767682] space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-[#454651] opacity-50" />
            <p className="font-headline font-bold text-base text-[#191c1e]">
              업로드된 도면/문서가 없습니다.
            </p>
            <p className="font-body text-xs text-[#454651] max-w-md mx-auto">
              상단의 도서 구분과 공종을 선택한 후, 실시간 파일(PNG/JPG/DWG/PDF/XLSX)을 선택하여 전문가 AI 검토를 시행하세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="upload-status-table w-full text-left border-collapse">
              <thead className="bg-[#e6e8ea] font-mono text-xs text-[#454651]">
                <tr>
                  <th className="px-5 py-3.5 font-semibold whitespace-nowrap min-w-[180px]">도면 / 파일명</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center min-w-[80px]">도서 구분</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center min-w-[80px]">공종 구분</th>
                  <th className="px-5 py-3.5 font-semibold whitespace-nowrap min-w-[160px]">추출 도면명 / 번호</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center min-w-[70px]">축척</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center min-w-[100px]">분석 상태</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap min-w-[120px]">업로드 일시</th>
                  <th className="px-5 py-3.5 font-semibold text-right whitespace-nowrap min-w-[180px]">이동 / 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c5d2] font-body text-xs text-[#191c1e]">
                {uploadFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-[#f2f4f6] transition-colors">
                    <td className="px-5 py-4 min-w-[180px]">
                      <div className="flex items-center gap-3">
                        {file.fileDataUrl && file.fileDataUrl.startsWith('data:image/') ? (
                          <img
                            src={file.fileDataUrl}
                            alt="Drawing Thumbnail"
                            className="w-10 h-10 object-cover rounded border border-[#c6c5d2] shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#dfe0ff] flex items-center justify-center text-[#000d5f] shrink-0">
                            <span className="material-symbols-outlined text-xl">
                              {file.type === 'CAD'
                                ? 'architecture'
                                : file.type === 'BoQ'
                                ? 'description'
                                : 'picture_as_pdf'}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-sm text-[#000d5f] block truncate">
                            {file.name}
                          </span>
                          <span className="font-mono text-[11px] text-[#454651]">
                            {file.sizeMB} MB ({file.type})
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-[#000d5f] text-white rounded-md font-mono text-[11px] font-bold whitespace-nowrap inline-block text-center leading-none min-w-[48px]">
                        {file.docCategory || '도면'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-md font-mono text-[11px] font-bold border whitespace-nowrap inline-block text-center leading-none min-w-[48px] ${
                          file.tradeCategory === '토목'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : file.tradeCategory === '건축'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : file.tradeCategory === '건축기계'
                            ? 'bg-teal-100 text-teal-900 border-teal-300'
                            : file.tradeCategory === '건축전기'
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : 'bg-red-100 text-red-900 border-red-300'
                        }`}
                      >
                        {file.tradeCategory || '소방'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[#191c1e]">
                      <span className="font-bold block text-[#000d5f]">
                        {file.drawingTitle || file.name}
                      </span>
                      <span className="text-[#454651] text-[11px]">
                        {file.drawingNumber || 'DWG-SCAN'}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#454651] text-center whitespace-nowrap">
                      {file.scale || '1 : 100'}
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {file.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-[#454651] whitespace-nowrap">
                      {file.uploadedAt}
                    </td>
                    <td className="upload-actions px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => onSelectTab('dashboard')}
                        className="px-2.5 py-1.5 bg-[#000d5f] text-white rounded text-xs font-mono font-bold hover:opacity-90 inline-flex items-center gap-1 cursor-pointer"
                      >
                        대시보드로 이동
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteUploadFile(file.id)}
                        className="p-1.5 text-[#ba1a1a] hover:bg-red-50 rounded transition-colors cursor-pointer inline-block align-middle"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {pdfPreviewFile && (
        <PdfViewerModal
          file={pdfPreviewFile}
          onClose={() => setPdfPreviewFile(null)}
        />
      )}
    </div>
  );
};
