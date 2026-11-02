import { coordinate, hasCoordinates } from './reviewCoordinates';
import { isAssumedVeCost } from './veCost';

export type ReviewSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export const severityLabel = (severity?: string) => severity === 'CRITICAL' ? '심각' : severity === 'INFO' ? '적절' : '주의';
export const severityColor = (severity?: string) => severity === 'CRITICAL' ? '#dc2626' : severity === 'INFO' ? '#2563eb' : '#d97706';

type Finding = Record<string, any>;
export function classifyFinding(item: Finding): { severity: ReviewSeverity; findingStatus: 'PASS' | 'FAIL' | 'NEEDS_CONFIRMATION' } {
  // New expert reviews carry a scoped structured verdict. Do not re-infer it
  // from words quoted in evidence or hypothetical/negated failure conditions.
  const scoped = ['document-check', 'independent-calculation', 'conditional-design'].includes(item.reviewBasis);
  const status = item.findingStatus ?? item.status;
  if (scoped && status === 'FAIL') return { severity: 'CRITICAL', findingStatus: 'FAIL' };
  if (item.reviewBasis === 'conditional-design' && (item.findingStatus ?? item.status) !== 'FAIL') return { severity: 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
  if (isAssumedVeCost(item.veCost || item)) return { severity: 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
  if (scoped && status === 'PASS') return { severity: 'INFO', findingStatus: 'PASS' };
  if (scoped && status === 'NEEDS_CONFIRMATION') return { severity: item.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
  // A scoped document comparison uses the verdict, not unrelated limitations in its evidence.
  const text = [item.title, item.comment, item.description, item.summary, item.details, item.observation,
    item.reviewBasis === 'document-check' || /^(도면 근거 확인 필요|법규 근거 미확인)$/.test(item.evidence || '') ? '' : item.evidence]
    .filter(value => typeof value === 'string').join('. ').replace(/\s+/g, ' ').trim();
  // Negated violations and descriptions of a check are not observed violations.
  const assertions = text
    .replace(/(?:위반|초과|미달|부적합|부적절|미충족|상충|부족)(?:(?:이나|나|또는|및|·)\s*(?:(?:실제|설계|법규)\s*)*(?:위반|초과|미달|부적합|부적절|미충족|상충|부족))*(?:을|를)\s*(?:의미|뜻)하지\s*않[가-힣]*/g, '')
    .replace(/(?:한계|허용치|허용값|상한|하한|제한값|기준값|최대치|최소치)[^.!?]{0,16}(?:근접|임박)(?:하지|하지는)\s*않[가-힣]*/g, '')
    .replace(/(?:기준|조건)(?:은|는|:)?[^.!?]{0,25}미만(?:이어야|이어야만|으로\s*규정|으로\s*설정)[^.!?]*/g, '')
    .replace(/(?:초과|미달|위반|상충|부족|부적합|부적절)(?:하지|되지|하지는|되지는)\s*않[가-힣]*/g, '')
    .replace(/(?:위반|상충|초과|미달|부족)\s*(?:없음|없다|없습니다|여부|가능성)/g, '')
    .replace(/(?:위반|상충|초과|미달|부족)\s*(?:시|하면|할 경우)/g, '');
  const nearLimit = /(?:한계|허용치|허용값|상한|하한|제한값|기준값|최대치|최소치).{0,16}(?:근접|임박)|(?:한계|허용)\s*근접/.test(assertions);
  const violation = /위반|상충|미충족|미달|초과|부적합|부적절|올바르지\s*않|(?:최소|하한|최저|요구치|요구값).{0,20}미만|(?:법규|규정|기준).{0,16}불일치|(?:내력|강도|용량|두께|성능|안전율|면적|수량).{0,12}부족|\bNG\b|\bNOT\s+OK\b/i.test(assertions);
  if (violation) return { severity: 'CRITICAL', findingStatus: 'FAIL' };
  if (nearLimit) return { severity: 'CRITICAL', findingStatus: 'NEEDS_CONFIRMATION' };
  if (/확인\s*(?:필요|불가|요망|해야)|추가\s*확인|미확인|(?:검증|검토|보완)\s*필요|판단\s*불가|불명확|확인되지|(?:초과|위반|적합|미달)\s*여부|가능성|추정|적절하지|적합하지|OK\s*(?:아님|아니)/i.test(text)) {
    return { severity: 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
  }
  if (item.findingStatus === 'FAIL' || item.status === 'FAIL') return { severity: 'CRITICAL', findingStatus: 'FAIL' };
  if (/적절|적합|올바르|올바르게|\bOK\b|문제\s*없|정상적으로|기준.{0,8}(?:충족|만족)|양호/i.test(assertions)) return { severity: 'INFO', findingStatus: 'PASS' };
  if ((item.findingStatus ?? item.status) === 'PASS') return { severity: 'INFO', findingStatus: 'PASS' };
  if ((item.findingStatus ?? item.status) === 'NEEDS_CONFIRMATION') return { severity: 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
  if (item.severity === 'CRITICAL' || item.severity === '위험' || item.severity === '심각') return { severity: 'CRITICAL', findingStatus: 'NEEDS_CONFIRMATION' };
  if (item.severity === 'INFO' || item.severity === '정상' || item.severity === '적절') return { severity: 'INFO', findingStatus: 'PASS' };
  return { severity: 'WARNING', findingStatus: 'NEEDS_CONFIRMATION' };
}

const normalText = (value: unknown) => typeof value === 'string' ? value.toLowerCase().replace(/[\s.,:;()[\]·-]/g, '') : '';
const itemTexts = (item: Finding) => [item.title, item.comment, item.description, item.finding, item.evidence, item.text].map(normalText).filter(text => text.length >= 6);
function directPosition(item: Finding) {
  if (hasCoordinates(item)) return { xPercent: coordinate(item.xPercent), yPercent: coordinate(item.yPercent) };
  // Only explicitly normalized boxes are accepted; pixel coordinates are not guessed.
  const b = item.bboxPercent || (item.coordinateSpace === 'percent' ? item.bbox : undefined);
  if (b && [b.x, b.y, b.width, b.height].every(Number.isFinite) && b.width > 0 && b.height > 0 && b.x >= 0 && b.y >= 0 && b.x + b.width <= 100 && b.y + b.height <= 100) {
    return { xPercent: b.x + b.width / 2, yPercent: b.y + b.height / 2 };
  }
  return undefined;
}
export function locateFinding(item: Finding, candidates: Finding[] = []) {
  const direct = directPosition(item);
  if (direct) return direct;
  const references = [item.sourceId, item.markupId, item.visualFindingId, item.ocrBlockId].filter(Boolean);
  const texts = itemTexts(item);
  const matches = candidates.filter(candidate => candidate !== item && directPosition(candidate) &&
    (item.pageNumber == null || candidate.pageNumber == null || candidate.pageNumber === item.pageNumber) &&
    (references.includes(candidate.id) || (item.id && item.id === candidate.id) || itemTexts(candidate).some(text => texts.includes(text))));
  const positions = new Map(matches.map(candidate => {
    const position = directPosition(candidate)!;
    return [JSON.stringify([candidate.pageNumber ?? item.pageNumber, position.xPercent, position.yPercent]), { ...position, pageNumber: candidate.pageNumber ?? item.pageNumber }];
  }));
  return positions.size === 1 ? [...positions.values()][0] : {};
}
export function normalizeFinding<T extends Finding>(item: T, candidates: Finding[] = []): Omit<T, 'severity' | 'findingStatus'> & ReturnType<typeof classifyFinding> {
  return { ...item, ...classifyFinding(item), ...locateFinding(item, candidates) };
}
