import type { UploadFile, ReviewItem, DesignErrorItem, SafetyItem, VeItem } from '../types';
import { normalizeFinding } from './reviewClassification';
import { normalizeVeCost, calculateVeCost, isAssumedVeCost } from './veCost';
import { veAdoptionFingerprint } from './veAdoption';
export interface ReviewBundle { uploadFile: UploadFile; reviewItem: ReviewItem; designErrors: DesignErrorItem[]; safetyItems: SafetyItem[]; veItems: VeItem[]; }
const base = '/api/local/reviews';
async function request(url: string, options?: RequestInit) {
  const operation = options?.method === 'DELETE' ? '삭제' : !options?.method || options.method === 'GET' ? '불러오기' : '저장';
  let response: Response;
  try { response = await fetch(url, { ...options, signal: options?.signal || AbortSignal.timeout(60000) }); }
  catch {
    throw new Error('로컬 ' + operation + ' 실패: 로컬 서버에 연결할 수 없습니다. 프로그램 폴더의 start-local.bat을 실행한 뒤 다시 시도해 주세요. 브라우저만 열려 있어도 서버가 종료되면 저장할 수 없습니다.');
  }
  if (!response.ok) {
    let detail = '서버 응답을 확인하지 못했습니다.';
    try {
      const text = await response.text();
      try {
        const body = JSON.parse(text);
        const code = String(body.detail || '');
        detail = ['EPERM', 'EBUSY', 'EACCES'].includes(code)
          ? '파일 또는 폴더가 사용 중이거나 접근 권한이 없습니다. 잠시 후 다시 시도하세요. (' + code + ')'
          : String(body.error || detail);
      } catch { detail = text.slice(0, 160); }
    } catch {}
    throw new Error('로컬 ' + operation + ' 실패: ' + detail);
  }
  return response.status === 204 ? null : response.json();
}
const stored = new Map<string, any>();
const hydratedAssets = new Map<string, string>();
function normalizeBundle(bundle: ReviewBundle): ReviewBundle {
  const candidates = [...(bundle.reviewItem.markups || []), ...(bundle.uploadFile.markups || []), ...(bundle.reviewItem.ocrBlocks || [])];
  const veItems = bundle.veItems.map(item => normalizeVeCost(normalizeFinding(item, candidates)));
  const markups = (bundle.reviewItem.markups || bundle.uploadFile.markups || []).map(item => {
    const matches = veItems.filter(v => item.veItemId === v.id || (/원가|VE/.test(item.category || '') && (v.pageNumber === item.pageNumber) && [item.comment, item.title].includes(v.description)));
    const v = matches.length === 1 ? matches[0] : undefined;
    return normalizeFinding(v ? { ...item, veItemId: v.id, veCost: { costBasisType: v.costBasisType, costEstimate: v.costEstimate, beforeCostKw: v.beforeCostKw, afterCostKw: v.afterCostKw, calculationBasis: v.calculationBasis } } : item, candidates);
  });
  const narrative = bundle.reviewItem.reviewNarrative;
  const reviewNarrative = narrative ? { ...narrative, checklistReview: narrative.checklistReview?.map(item => {
    const normalized = normalizeFinding({ ...item, title: item.topic, description: item.observation });
    return { ...item, severity: normalized.severity, status: normalized.findingStatus };
  }) } : undefined;
  return { ...bundle, reviewItem: { ...bundle.reviewItem, markups, reviewNarrative },
    uploadFile: { ...bundle.uploadFile, markups, reviewNarrative },
    designErrors: bundle.designErrors.map(item => normalizeFinding(item, candidates)),
    safetyItems: bundle.safetyItems.map(item => { const normalized = normalizeFinding(item, candidates); return { ...normalized, severity: normalized.severity === 'CRITICAL' ? '위험' : normalized.severity === 'INFO' ? '정상' : '주의' }; }),
    veItems,
  };
}
async function transform(value: any, convert: (s: string) => Promise<string>): Promise<any> {
  if (typeof value === 'string') return convert(value);
  if (Array.isArray(value)) return Promise.all(value.map(x => transform(x, convert)));
  if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([k, v]) => [k, await transform(v, convert)])));
  return value;
}
async function hydrate(bundle: ReviewBundle) {
  const pending = new Map<string, Promise<string>>();
  return transform(bundle, async s => {
    if (!s.startsWith(base + '/')) return s;
    if (hydratedAssets.has(s)) return hydratedAssets.get(s)!;
    if (!pending.has(s)) pending.set(s, (async () => {
      const response = await fetch(s); if (!response.ok) throw new Error('저장된 원본/미리보기 복원 실패');
      const blob = await response.blob();
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(blob); });
      hydratedAssets.set(s, data); return data;
    })());
    return pending.get(s)!;
  });
}
export async function loadLocalReviews(): Promise<{ bundles: ReviewBundle[]; errors: string[] }> {
  const result = await request(base); const bundles = []; const errors = [...result.errors];
  for (const record of result.records) {
    try {
      if (record.schemaVersion !== 1) throw new Error('지원하지 않는 저장 버전');
      stored.set(record.id, record.bundle); bundles.push(normalizeBundle(await hydrate(record.bundle)));
    } catch (error: any) { errors.push(`${record.id}: ${error.message}`); }
  }
  return { bundles, errors };
}
export async function saveLocalReview(bundle: ReviewBundle): Promise<ReviewBundle> {
  bundle = normalizeBundle(bundle);
  const id = /^[0-9a-f-]{36}$/i.test(bundle.uploadFile.documentId || '') ? bundle.uploadFile.documentId! : (await request(base, { method: 'POST' })).id;
  const attach = (item: any) => ({ ...item, documentId: id, projectId: bundle.reviewItem.projectId });
  const linked: ReviewBundle = { uploadFile: attach(bundle.uploadFile), reviewItem: attach(bundle.reviewItem), designErrors: bundle.designErrors.map(attach), safetyItems: bundle.safetyItems.map(attach), veItems: bundle.veItems.map(attach) };
  const assets = new Map<string, Promise<string>>();
  for (const [url, data] of hydratedAssets) if (url.startsWith(`${base}/${id}/`)) assets.set(data, Promise.resolve(url));
  const saved = await transform(linked, async s => {
    if (!s.startsWith('data:')) return s;
    if (!assets.has(s)) assets.set(s, (async () => {
      const blob = await (await fetch(s)).blob();
      const result = await request(`${base}/${id}/assets`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob });
      hydratedAssets.set(result.url, s); return result.url;
    })());
    return assets.get(s)!;
  });
  await request(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saved) });
  stored.set(id, saved); return linked;
}
export async function updateLocalReview(review: ReviewItem) {
  const id = review.documentId; const bundle = id && stored.get(id);
  if (!bundle) throw new Error('먼저 도면을 저장해야 합니다.');
  const next = { ...bundle, uploadFile: { ...bundle.uploadFile, markups: review.markups, reviewNarrative: review.reviewNarrative }, reviewItem: { ...bundle.reviewItem, opinionConfirmations: review.opinionConfirmations, engineerNotes: review.engineerNotes, status: review.status, result: review.result, description: review.description, reviewNarrative: review.reviewNarrative, markups: review.markups } };
  await request(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); stored.set(id, next);
}
export async function deleteLocalReview(id: string) { await request(`${base}/${id}`, { method: 'DELETE' }); stored.delete(id); for (const url of hydratedAssets.keys()) if (url.startsWith(`${base}/${id}/`)) hydratedAssets.delete(url); }
export async function updateLocalVeCost(item: VeItem): Promise<ReviewBundle> {
  const id = item.documentId, bundle = id && stored.get(id);
  if (!bundle || !bundle.veItems.some((v: VeItem) => v.id === item.id)) throw new Error('먼저 원본 문서를 저장해야 합니다.');
  const normalized = normalizeVeCost(item);
  const next = normalizeBundle({ ...bundle, veItems: bundle.veItems.map((v: VeItem) => v.id === item.id ? { ...v, costBasisType: item.costBasisType, costEstimate: item.costEstimate, beforeCostKw: normalized.beforeCostKw, afterCostKw: normalized.afterCostKw, impactKw: normalized.impactKw, savingsRate: normalized.savingsRate, calculationBasis: item.calculationBasis } : v) });
  await request(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
  stored.set(id, next); return hydrate(next);
}
export async function updateLocalVeAdoption(item: VeItem, accepted: boolean): Promise<ReviewBundle> {
  const id = item.documentId, bundle = id && stored.get(id);
  const current = bundle?.veItems.find((v: VeItem) => v.id === item.id);
  if (!current) throw new Error('먼저 원본 문서를 저장해야 합니다.');
  if (accepted && (calculateVeCost(current).state !== 'calculated' || veAdoptionFingerprint(current) !== veAdoptionFingerprint(item))) throw new Error('산출자료가 변경되었거나 미산정입니다. 최신 금액을 확인하고 다시 선택하세요.');
  const adoption = { accepted, fingerprint: veAdoptionFingerprint(current), updatedAt: new Date().toISOString() };
  const next = { ...bundle, veItems: bundle.veItems.map((v: VeItem) => v.id === item.id ? { ...v, adoption } : v) };
  await request(`${base}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
  stored.set(id, next); return normalizeBundle(await hydrate(next));
}
export async function estimateLocalVeCost(item: VeItem, review?: ReviewItem): Promise<ReviewBundle> {
  const previous = item.documentId && stored.get(item.documentId);
  if (!previous) throw new Error('먼저 원본 문서를 저장하세요.');
  const context = { fileName: review?.fileName, drawingTitle: review?.drawingTitle, docCategory: review?.docCategory,
    pageNumber: item.pageNumber, relatedOpinions: (review?.markups || []).filter(m => m.pageNumber === item.pageNumber).slice(0, 8).map(m => ({ title: m.title, comment: m.comment, evidence: m.evidence, pageNumber: m.pageNumber })) };
  const response = await fetch('/api/gemini/estimate-ve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(150000),
    body: JSON.stringify({ provider: previous.reviewItem.ai?.provider || 'gemini', model: previous.reviewItem.ai?.requestedModel || undefined, item: { description: item.description, subDescription: item.subDescription, evidence: item.evidence, location: item.location, tradeCategory: item.tradeCategory, pageNumber: item.pageNumber, costEstimate: item.costEstimate, calculationBasis: item.calculationBasis, beforeCostKw: item.beforeCostKw, afterCostKw: item.afterCostKw }, context }) });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.detail || result.error || 'LLM 가정 산출 실패');
  if (!isAssumedVeCost(result.data) || calculateVeCost(result.data).state !== 'calculated') throw new Error('LLM 가정 표시 또는 산출 근거가 누락되었습니다.');
  if (stored.get(item.documentId!) !== previous) throw new Error('산출 중 문서가 변경되었습니다. 다시 시도하세요.');
  return updateLocalVeCost({ ...item, ...result.data, costBasisType: 'llm-assumption' });
}
