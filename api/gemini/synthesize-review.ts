import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateReviewJson, isDirectReviewProvider, reviewAiError, reviewAiHttpStatus } from '../../src/services/reviewAiService.js';
import { synthesizeNvidiaReview } from '../../src/services/llmService.js';
import { parseModelJson } from '../../src/lib/reviewNormalization.js';
import { expertReviewGuidance } from '../../src/lib/expertReviewGuidance.js';
import { structuralReviewGuidance } from '../../src/lib/structuralReviewGuidance.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { fileName, docCategory = '도면', provider, model, pageResults, totalPages, failedPages = [] } = req.body || {};
  if (typeof fileName !== 'string' || !(isDirectReviewProvider(provider) || provider === 'nvidia') || !pageResults || !Number.isInteger(totalPages) || totalPages < 2 || !Array.isArray(failedPages)) {
    return res.status(400).json({ error: '파일명, 엔진, 페이지 결과와 전체 페이지 수가 필요합니다.' });
  }
  try {
    // Normalized items repeat the same action under several legacy field names.
    // Send each opinion once while retaining its evidence and design conditions.
    const compactItem = (item: any) => ({ title: item.title, description: item.description, evidence: item.evidence,
      pageNumber: item.pageNumber, codeClause: item.codeClause, severity: item.severity, status: item.findingStatus || item.status,
      reviewBasis: item.reviewBasis, recommendation: item.recommendation || item.correctiveAction || item.suggestedFix || item.requiredConfirmation,
      verification: item.verification, calculationBasis: item.calculationBasis, costEstimate: item.costEstimate });
    const pages = Array.isArray(pageResults.pages) ? pageResults.pages.map((page: any) => ({ ...page,
      ...Object.fromEntries(['designItems', 'safetyItems', 'veItems'].filter(key => Array.isArray(page[key])).map(key => [key, page[key].map(compactItem)])) })) : undefined;
    const source = JSON.stringify(pages ? { pages } : pageResults);
    if (source.length > 180000) return res.status(413).json({ error: '종합 검토 근거가 180,000자를 초과했습니다. 페이지별 결과를 보존하고 문서를 나누어 검토하세요.' });
    const prompt = `한국어 엔지니어링 검토 요약을 작성하세요. 아래 페이지별 관찰과 검토의견만 종합하세요. 새로운 수치·법규·위반·좌표를 만들지 마세요. 누락된 페이지는 검토하지 않았음을 명시하세요. 의견별 페이지를 유지하세요. ${expertReviewGuidance} ${structuralReviewGuidance} 같은 쟁점의 반복된 한계 설명은 묶고 핵심 설계 판단, 조건부 설계 개선안과 그 근거/조치를 우선 요약하세요. JSON 형식: {"summary":"페이지 간 관계와 종합의견"}. 문서 종류: ${docCategory}, 파일: ${fileName}, 전체 ${totalPages}페이지, 실패 페이지: ${JSON.stringify(failedPages)}, 페이지 결과: ${source}`;
    const result = isDirectReviewProvider(provider) ? (await generateReviewJson(provider, prompt, { model })).data : parseModelJson(await synthesizeNvidiaReview(prompt));
    if (typeof result?.summary !== 'string' || !result.summary.trim()) throw new Error('종합 검토 요약이 없습니다.');
    return res.status(200).json({ success: true, data: { reviewSummary: { ...pageResults.reviewSummary, description: result.summary, result: result.summary } } });
  } catch (error) {
    return res.status(reviewAiHttpStatus(error)).json({ error: '종합 검토 실패', detail: reviewAiError(error) });
  }
}
