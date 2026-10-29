import { normalizeFinding } from './reviewClassification';
import { normalizeVeCost } from './veCost';
export { coordinate, hasCoordinates } from './reviewCoordinates';
export type FindingStatus = 'PASS' | 'FAIL' | 'NEEDS_CONFIRMATION';
export type ExecutionState = 'complete' | 'partial' | 'failed';
export interface ReviewExecution {
  state: ExecutionState;
  totalPages: number;
  successfulPages: number[];
  failedPages: { pageNumber: number; reason: string }[];
  partialPages: number[];
  partialReasons?: { pageNumber: number; reason: string }[];
  synthesisError?: string;
}

export function findingStatus(value: unknown): FindingStatus {
  return value === 'PASS' || value === 'FAIL' ? value : 'NEEDS_CONFIRMATION';
}
export function parseModelJson(text: string): any {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch {
    try { return JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1)); }
    catch { throw new Error('AI 응답이 유효한 JSON이 아닙니다.'); }
  }
}
const list = (value: unknown, name: string): any[] => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`AI 응답 ${name}은 배열이어야 합니다.`);
  return value;
};
export function normalizeReview(value: any, pageNumber?: number, totalPages = 1): any {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('AI 검토 응답 객체가 없습니다.');
  if (!['designItems', 'designErrors', 'safetyItems', 'veItems', 'findings'].some(k => Array.isArray(value[k]))) {
    throw new Error('AI 검토 응답에 검토항목 배열이 없습니다.');
  }
  const normalizeItems = (items: any[], category: string) => items.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${category} 검토항목 형식 오류`);
    const page = pageNumber ?? (Number.isInteger(item.pageNumber) && item.pageNumber >= 1 && item.pageNumber <= totalPages ? item.pageNumber : undefined);
    const normalized = normalizeFinding({ ...item, pageNumber: page }, [...(Array.isArray(value.markups) ? value.markups : []), ...(Array.isArray(value.visualFindings) ? value.visualFindings : []), ...(Array.isArray(value.ocrBlocks) ? value.ocrBlocks : [])]);
    return { ...normalized, sourceId: item.sourceId || item.id, id: `${category}-p${page ?? 'unknown'}-${index + 1}`,
      title: String(item.title || item.summary || item.description || '검토항목'),
      description: String(item.description || item.details || item.summary || ''),
      evidence: String(item.evidence || '도면 근거 확인 필요'),
      codeClause: String(item.codeClause || item.legalBasis || item.lawRegulation || '법규 근거 미확인'),
      status: normalized.findingStatus,
      pageNumber: page,
    };
  });
  const designItems = normalizeItems(list(value.designItems ?? value.designErrors, 'designItems'), 'design');
  const safetyItems = normalizeItems(list(value.safetyItems, 'safetyItems'), 'safety');
  const veItems = normalizeItems(list(value.veItems, 'veItems'), 've').map((item: any) => normalizeVeCost(item));
  const all = [...designItems, ...safetyItems, ...veItems];
  const status = all.some(x => x.status === 'FAIL') ? '오류 의심' : all.length && all.every(x => x.status === 'PASS') ? '정상' : '주의';
  return { ...value, reviewNarrative: undefined, designItems, designErrors: designItems, safetyItems, veItems,
    findings: normalizeItems(list(value.findings, 'findings'), 'finding'),
    ocrBlocks: list(value.ocrBlocks, 'ocrBlocks').map(x => typeof x === 'string' ? { text: x, pageNumber } : { ...x, pageNumber: pageNumber ?? x.pageNumber }),
    visualFindings: list(value.visualFindings, 'visualFindings').map(x => typeof x === 'string' ? { finding: x, pageNumber } : { ...x, pageNumber: pageNumber ?? x.pageNumber }),
    markups: list(value.markups, 'markups'),
    summary: String(value.summary || value.reviewSummary?.description || ''),
    reviewSummary: { status, result: String(value.summary || value.reviewSummary?.result || '검토항목을 확인하세요.'), description: String(value.summary || value.reviewSummary?.description || '') },
  };
}
export function executionLabel(execution?: ReviewExecution): string {
  if (!execution) return '검토 상태 미확인';
  const counts = `${execution.successfulPages.length}/${execution.totalPages}페이지${execution.partialPages.length ? ` · 추가 확인 ${execution.partialPages.length}페이지` : ''}`;
  return `${execution.state === 'complete' ? '검토 완료' : execution.state === 'partial' ? '부분 완료' : '검토 실패'} (${counts})`;
}
