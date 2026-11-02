const labels: Record<string, string> = {
  source: '출처', sourcePage: '출처 페이지', page: '페이지', pageNumber: '페이지', member: '부재', memberId: '부재 번호', section: '단면',
  observation: '관찰', observed: '확인값', values: '값', calculation: '계산', formula: '계산식', result: '결과', limit: '허용값', unit: '단위',
  comparison: '비교', loadCombination: '하중조합', conclusion: '판단', rationale: '판단 근거', recommendation: '권고', verification: '확인 조건',
};
/** Preserve structured model evidence as readable text instead of String(object). */
export function reviewText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(reviewText).filter(Boolean).join('\n');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => {
    const text = reviewText(item);
    return text ? `${labels[key] || key}: ${text}` : '';
  }).filter(Boolean).join('\n');
  return '';
}
