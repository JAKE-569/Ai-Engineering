export interface VeCostLine {
  label: string;
  unit: string;
  beforeQuantity?: number;
  afterQuantity?: number;
  beforeUnitPrice?: number;
  afterUnitPrice?: number;
  quantitySource: string;
  unitPriceSource: string;
}
export interface VeCostEstimate {
  basisType?: 'llm-assumption' | 'source-data';
  generatedAt?: string;
  generatedBy?: string;
  currency: 'KRW';
  lines: VeCostLine[];
  additionalCost?: number;
  additionalCostBasis?: string;
  scope?: string;
  priceDate?: string;
  vatBasis?: string;
  assumptions?: string[];
  missingInputs?: string[];
}
export interface VeCostInput {
  costBasisType?: 'llm-assumption' | 'source-data';
  costEstimate?: VeCostEstimate;
  beforeCostKw?: number;
  afterCostKw?: number;
  calculationBasis?: string;
}
export const won = (value?: number) => typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원` : '미산정';
const numeric = (n: unknown): number | undefined => {
  if (typeof n === 'string' && /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(n.trim())) n = Number(n.replaceAll(',', ''));
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER ? n : undefined;
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
export const isAssumedVeCost = (input: VeCostInput) => input.costBasisType === 'llm-assumption' || input.costEstimate?.basisType === 'llm-assumption' ||
  [input.calculationBasis, input.costEstimate?.additionalCostBasis, ...(Array.isArray(input.costEstimate?.lines) ? input.costEstimate.lines : []).flatMap(l => [l?.quantitySource, l?.unitPriceSource])].some(v => typeof v === 'string' && /LLM\s*(가정|추정)/i.test(v));
export function calculateVeCost(input: VeCostInput) {
  const estimate = input.costEstimate;
  const assumed = isAssumedVeCost(input);
  const missing: string[] = [];
  const formulas: string[] = [];
  const sources: string[] = [];
  let before: number | undefined, after: number | undefined;
  if (estimate) {
    if (estimate.currency !== 'KRW') missing.push('원화(KRW) 환산 금액 및 환율 근거');
    if (!Array.isArray(estimate.lines) || !estimate.lines.length) missing.push('변경 전·후 수량 및 단가 내역');
    let b = 0, a = 0;
    for (const [i, line] of (Array.isArray(estimate.lines) ? estimate.lines : []).entries()) {
      const label = text(line?.label) || `항목 ${i + 1}`;
      const bq = numeric(line?.beforeQuantity), aq = numeric(line?.afterQuantity), bp = numeric(line?.beforeUnitPrice), ap = numeric(line?.afterUnitPrice);
      if (bq === undefined || aq === undefined) missing.push(`${label}: 변경 전·후 수량`);
      if (bp === undefined || ap === undefined) missing.push(`${label}: 변경 전·후 단가(원)`);
      if (!text(line?.unit)) missing.push(`${label}: 수량 단위`);
      if (!text(line?.quantitySource)) missing.push(`${label}: 수량 출처(문서·페이지/산출서)`);
      if (!text(line?.unitPriceSource)) missing.push(`${label}: 단가 출처(견적·단가표·기준일)`);
      sources.push(`${label} 수량 근거: ${text(line?.quantitySource) || '미제공'} / 단가 근거: ${text(line?.unitPriceSource) || '미제공'}`);
      if ([bq, aq, bp, ap].every(n => n !== undefined)) {
        const beforeLine = Math.round(bq! * bp!), afterLine = Math.round(aq! * ap!);
        b += beforeLine; a += afterLine;
        formulas.push(`${label}: (${bq} ${line.unit} × ${won(bp)}) − (${aq} ${line.unit} × ${won(ap)}) = ${won(beforeLine - afterLine)}`);
      }
    }
    const extra = numeric(estimate.additionalCost);
    if (extra === undefined) missing.push('설계변경·철거·시험 등 추가비용(없으면 0원)');
    if (!text(estimate.additionalCostBasis)) missing.push('추가비용 산정 또는 0원 적용 근거');
    if (!text(estimate.scope)) missing.push('동일 범위의 비교 대상 공사');
    if (!text(estimate.vatBasis)) missing.push('변경 전·후 동일한 부가세 포함/제외 기준');
    if (assumed && !estimate.assumptions?.some(v => typeof v === 'string' && v.trim())) missing.push('LLM 가정값과 가정 이유');
    if (!assumed && Array.isArray(estimate.missingInputs)) missing.push(...estimate.missingInputs.filter(v => typeof v === 'string' && v.trim()));
    if (assumed && Array.isArray(estimate.missingInputs)) sources.push(...estimate.missingInputs.filter(v => typeof v === 'string').map(v => `실제 적용 전 확인자료: ${v}`));
    if (!Number.isSafeInteger(b) || !Number.isSafeInteger(a + (extra || 0))) missing.push('계산 가능한 범위의 수량·단가');
    if (!missing.length) { before = b; after = a + extra!; }
    formulas.push(`추가비용: ${won(extra)} (${text(estimate.additionalCostBasis) || '근거 미제공'})`);
    sources.push(`비교 범위: ${text(estimate.scope) || '미제공'}`, `단가 기준일: ${text(estimate.priceDate) || '출처 문서 참조'}`, `부가세: ${text(estimate.vatBasis) || '미확인'}`);
    if (Array.isArray(estimate.assumptions)) sources.push(...estimate.assumptions.filter(v => typeof v === 'string').map(v => `적용 조건: ${v}`));
  } else {
    const b = numeric(input.beforeCostKw), a = numeric(input.afterCostKw);
    if (b === undefined || a === undefined) missing.push('동일 공사 범위의 변경 전·후 총액 또는 수량·단가');
    if (!text(input.calculationBasis)) missing.push('총액 출처·비교 범위·부가세·추가비용 반영 근거');
    if (!missing.length) { before = Math.round(b!); after = Math.round(a!); }
    sources.push(text(input.calculationBasis) || '산출 근거 미제공', '총액 비교 방식: 개별 수량·단가 내역은 별도 확인');
  }
  const savings = before !== undefined && after !== undefined ? before - after : undefined;
  const rate = before !== undefined && before > 0 && savings !== undefined ? savings / before * 100 : undefined;
  const formula = savings === undefined ? '순절감액 = 변경 전 Σ(수량 × 단가) − 변경 후 Σ(수량 × 단가) − 추가비용' : `${won(before)} − ${won(after)} = ${won(savings)}`;
  return { state: savings === undefined ? 'needs-input' as const : 'calculated' as const, assumed, before, after, savings, rate, formula, formulas, sources, missing: [...new Set(missing)] };
}
export function veCostText(input: VeCostInput) {
  const c = calculateVeCost(input);
  return [c.assumed ? '산출 구분: LLM 가정 산출치 · 실제 견적/확정 절감액 아님' : '산출 구분: 입력·자료 기반 산출', `순절감금액: ${won(c.savings)}${c.savings !== undefined && c.savings < 0 ? ' (비용 증가)' : ''}`, `산출식: ${c.formula}`, ...c.formulas, ...c.sources, ...c.missing.map(s => `산정자료 필요: ${s}`)].join('\n');
}
export function normalizeVeCost<T extends VeCostInput>(input: T) {
  const c = calculateVeCost(input);
  return { ...input, costBasisType: c.assumed ? 'llm-assumption' as const : input.costBasisType, beforeCostKw: c.before ?? input.beforeCostKw, afterCostKw: c.after ?? input.afterCostKw, impactKw: c.savings, savingsRate: c.rate };
}
export function opinionEvidence(item: { evidence?: string; veCost?: VeCostInput }) {
  return [item.evidence, item.veCost ? veCostText(item.veCost) : ''].filter(Boolean).join('\n\n');
}
export function normalizeAssumedVeEstimate(data: any, model: string) {
  const raw = data?.costEstimate;
  if (!raw || !Array.isArray(raw.lines) || !raw.lines.length || raw.lines.length > 20 || !Array.isArray(raw.assumptions) || !raw.assumptions.some((v: any) => typeof v === 'string' && v.trim())) throw new Error('가정 수량·단가 내역과 가정 이유가 필요합니다.');
  const costEstimate: VeCostEstimate = { ...raw, basisType: 'llm-assumption', generatedAt: new Date().toISOString(), generatedBy: model,
    lines: raw.lines.map((line: any) => ({ ...line, quantitySource: `LLM 가정/자료 참고: ${text(line?.quantitySource) || '기존 의견을 기준으로 물량 가정'}`, unitPriceSource: `LLM 가정/자료 참고: ${text(line?.unitPriceSource) || '실제 견적 없는 계획 단가'}` })),
    additionalCostBasis: `LLM 가정/자료 참고: ${text(raw.additionalCostBasis) || '추가비용 가정 근거 미제공'}` };
  const input: VeCostInput = { costBasisType: 'llm-assumption', costEstimate, calculationBasis: `LLM 가정 산출치: ${text(data.calculationBasis).replace(/^(?:LLM\s*가정\s*산출치\s*[:：]?\s*)+/i, '') || '기존 검토의견으로 구성한 비용 비교 시나리오'}` };
  const c = calculateVeCost(input);
  if (c.state !== 'calculated') throw new Error(`가정 산출 자료가 불완전합니다: ${c.missing.join(', ')}`);
  return normalizeVeCost(input);
}
export function veCsv(items: (VeCostInput & { description: string; tradeCategory?: string; docCategory?: string })[]) {
  const quote = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return '\uFEFF' + [['공종', '도서', '제안명', '변경 전(원)', '변경 후·추가비용 포함(원)', '순절감액(원)', '절감률(%)', '산정 상태', '산출식·근거'], ...items.map(i => {
    const c = calculateVeCost(i);
    return [i.tradeCategory, i.docCategory, i.description, c.before, c.after, c.savings, c.rate?.toFixed(1), c.state === 'calculated' ? c.assumed ? 'LLM 가정 산출치' : '자료 기반 산정 완료' : '산정자료 필요', veCostText(i)];
  })].map(row => row.map(quote).join(',')).join('\r\n');
}
