import { Project, ReviewItem, SafetyItem, DesignErrorItem, VeItem, UploadFile } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'POSCO-PLANT-01',
    code: 'POSCO-PLANT-01',
    name: '포항 플랜트 통합 엔지니어링 프로젝트',
    description: '업로드 도면 및 도서 AI OCR 정밀 검토 프로젝트',
  },
];

// Existing sample drawings cleared for real file upload and OCR review
export const INITIAL_REVIEW_ITEMS: ReviewItem[] = [];

export const INITIAL_SAFETY_ITEMS: SafetyItem[] = [];

export const INITIAL_DESIGN_ERRORS: DesignErrorItem[] = [];

export const INITIAL_VE_ITEMS: VeItem[] = [];

export const INITIAL_UPLOAD_FILES: UploadFile[] = [];
