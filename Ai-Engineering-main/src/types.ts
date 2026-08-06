export type PageTab = 'dashboard' | 'safety' | 'errors' | 'cost_ve' | 'upload' | 'report' | 'deploy_guide';

export type DocCategory = '도면' | '시방서' | '내역서';
export type TradeCategory = '토목' | '건축' | '건축기계' | '건축전기' | '소방';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
}

export type ReviewStatus = '오류 의심' | '주의' | '정상' | '미검토' | '긴급 확인' | '검토대기' | '검토중';
export type SeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | '위험' | '주의' | '정상';

export interface ReviewMarkup {
  id: string;
  pageNumber?: number;
  xPercent: number; // 0~100
  yPercent: number; // 0~100
  title: string;
  comment: string;
  codeClause?: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category?: string;
}

export interface OcrBlock {
  id: string;
  text: string;
  category: '표제란' | '치수' | '재질' | '특기사항' | '소방/안전' | '기타';
  confidence?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface ReviewItem {
  previewPages?: string[];
  id: string;
  fileName: string;
  fileType: string;
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  reviewType: '설계 오류' | '법규 및 안전' | '공사비 및 VE';
  status: ReviewStatus;
  result: string;
  updatedAt: string;
  projectId: string;
  description?: string;
  cadUrl?: string;
  fileDataUrl?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  rawOcrText?: string;
  ocrBlocks?: OcrBlock[];
  markups?: ReviewMarkup[];
  crossReferences?: { title: string; type: string; url?: string }[];
  engineerNotes?: string;
}

export interface SafetyItem {
  id: string;
  fileName: string;
  fileType: string;
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  reviewedAt: string;
  summary: string;
  lawRegulation: string;
  severity: '위험' | '주의' | '정상';
  status: string;
  details?: string;
  cadUrl?: string;
  fileDataUrl?: string;
  markups?: ReviewMarkup[];
}

export interface DesignErrorItem {
  previewPages?: string[];
  id: string;
  errorCode: string;
  dwgFile: string;
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  description: string;
  type: 'Structural' | 'Electrical' | 'Mechanical' | 'Other' | 'Civil' | 'Architectural' | 'Fire';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  ratio?: string;
  cadUrl?: string;
  fileDataUrl?: string;
  drawingTitle?: string;
  rawOcrText?: string;
  ocrBlocks?: OcrBlock[];
  markups?: ReviewMarkup[];
  suggestedFix?: string;
}

export interface VeItem {
  detailItems?: { label: string; quantity?: string; unitPrice?: number; amount?: number; formula?: string }[];
  id: string;
  type: 'VE 제안' | '수량 오류';
  docCategory?: DocCategory;
  tradeCategory?: TradeCategory;
  description: string;
  subDescription: string;
  location: string;
  impactKw: number; // in KRW (절감 금액)
  status: '검토대기' | '긴급 확인' | '검토중' | '승인완료' | '적용중';
  itemCode?: string;
  beforeCostKw?: number; // 변경 전 금액 (KRW)
  afterCostKw?: number; // 변경 후 금액 (KRW)
  savingsRate?: number; // 절감률 (%)
  scheduleDays?: number; // 공기 영향 (일)
  calculationBasis?: string; // 세부 산출 근거
  unitPriceComparison?: string; // 단가 비교 요약
}

export interface UploadFile {
  previewPages?: string[];
  id: string;
  name: string;
  type: 'CAD' | 'PDF' | 'Spec' | 'BoQ' | 'Image';
  docCategory: DocCategory;
  tradeCategory: TradeCategory;
  sizeMB: number;
  progress: number;
  status: '대기중' | '업로드중' | '분석중' | '분석 완료' | '오류';
  uploadedAt: string;
  fileDataUrl?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  scale?: string;
  rawOcrText?: string;
  ocrBlocks?: OcrBlock[];
  markups?: ReviewMarkup[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}
