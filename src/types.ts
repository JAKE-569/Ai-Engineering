export type PageTab = 'dashboard' | 'safety' | 'errors' | 'cost_ve' | 'upload' | 'deploy_guide';

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
}

export type ReviewStatus = '오류 의심' | '주의' | '정상' | '미검토' | '긴급 확인' | '검토대기' | '검토중';
export type SeverityLevel = 'CRITICAL' | 'WARNING' | 'INFO' | '위험' | '주의' | '정상';

export interface OcrBlock {
  id: string;
  text: string;
  category: '표제란' | '치수' | '재질' | '특기사항' | '소방/안전' | '기타';
  confidence?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface ReviewItem {
  id: string;
  fileName: string;
  fileType: string;
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
  crossReferences?: { title: string; type: string; url?: string }[];
  engineerNotes?: string;
}

export interface SafetyItem {
  id: string;
  fileName: string;
  fileType: string;
  reviewedAt: string;
  summary: string;
  lawRegulation: string;
  severity: '위험' | '주의' | '정상';
  status: string;
  details?: string;
  cadUrl?: string;
  fileDataUrl?: string;
}

export interface DesignErrorItem {
  id: string;
  errorCode: string;
  dwgFile: string;
  description: string;
  type: 'Structural' | 'Electrical' | 'Mechanical' | 'Other';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  ratio?: string;
  cadUrl?: string;
  fileDataUrl?: string;
  drawingTitle?: string;
  rawOcrText?: string;
  ocrBlocks?: OcrBlock[];
  suggestedFix?: string;
}

export interface VeItem {
  id: string;
  type: 'VE 제안' | '수량 오류';
  description: string;
  subDescription: string;
  location: string;
  impactKw: number; // in KRW
  status: '검토대기' | '긴급 확인' | '검토중';
}

export interface UploadFile {
  id: string;
  name: string;
  type: 'CAD' | 'PDF' | 'Spec' | 'BoQ' | 'Image';
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
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
}
