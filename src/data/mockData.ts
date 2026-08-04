import { Project, ReviewItem, SafetyItem, DesignErrorItem, VeItem, UploadFile } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'PH-2024-03',
    code: 'PH-2024-03',
    name: '포항 3고로 개수 공사 (PH-2024-03)',
    description: '포항 제철소 3고로 스마트 개수 및 설비 고도화 프로젝트',
  },
  {
    id: 'GY-2023-11',
    code: 'GY-2023-11',
    name: '광양 제강 설비 증설 (GY-2023-11)',
    description: '광양 제철소 고부가 강재 생산 전용 설비 증설 프로젝트',
  },
  {
    id: 'H2-POS-2024',
    code: 'H2-POS-2024',
    name: '수소 환원 제철 기술 실증 (H2-POS-2024)',
    description: 'HyREX 수소환원제철 실증 플랜트 엔지니어링 검토',
  },
];

// Existing sample drawings cleared for real file upload and OCR review
export const INITIAL_REVIEW_ITEMS: ReviewItem[] = [];

export const INITIAL_SAFETY_ITEMS: SafetyItem[] = [];

export const INITIAL_DESIGN_ERRORS: DesignErrorItem[] = [];

export const INITIAL_VE_ITEMS: VeItem[] = [];

export const INITIAL_UPLOAD_FILES: UploadFile[] = [];
