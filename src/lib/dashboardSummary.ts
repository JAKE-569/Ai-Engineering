import type { ReviewItem } from '../types';
import { classifyFinding } from './reviewClassification';

const concise = (value: string, max = 85) => {
  const text = value.replace(/[*#]+/g, '').replace(/\s+/g, ' ').trim();
  const first = text.match(/^.*?(?:[다요음함임됨]\.|[!?])(?:\s|$)/)?.[0].trim() || text;
  return first.length > max ? first.slice(0, max - 1).trimEnd() + '…' : first;
};

export function dashboardSummary(review: ReviewItem): string[] {
  const lines: string[] = [];
  if (review.execution?.state === 'failed') lines.push('분석 실패 · 재검토 필요');
  else if (review.execution?.state === 'partial') lines.push('일부 페이지 또는 종합 분석 미완료 · 재검토 필요');
  const priority = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  const score = (item: { title?: string; verdict: ReturnType<typeof classifyFinding> }) => priority[item.verdict.severity] * 100
    + (/표지|목차|문서 관리|개요|후속 페이지/.test(item.title || '') ? 20 : 0)
    - (/오류|불일치|누락|HOLD|미확정|중복|미수립/i.test(item.title || '') ? 5 : 0);
  const findings = (review.markups || []).map(m => ({ ...m, verdict: classifyFinding(m) })).sort((a, b) => score(a) - score(b));
  const groups = new Map<string, { detail: string; label: string; pages: Set<number> }>();
  for (const item of findings) {
    const title = (item.title || '').replace(/^\[[^\]]+\]\s*/, '');
    const detail = concise(title.length >= 12 ? title : item.comment || title);
    const key = /HOLD.*기초|기초.*(?:HOLD|미확정)/i.test(title) ? 'foundation-hold' : detail.replace(/\s+/g, '');
    if (!key) continue;
    const label = item.verdict.severity === 'CRITICAL' ? '심각' : item.verdict.severity === 'WARNING' ? '확인 필요' : '적절';
    if (!groups.has(key)) groups.set(key, { detail, label, pages: new Set() });
    if (item.pageNumber) groups.get(key)!.pages.add(item.pageNumber);
  }
  for (const group of groups.values()) {
    const pages = [...group.pages].sort((a, b) => a - b).join('·');
    lines.push(concise(`${group.label}${pages ? ` · ${pages}p` : ''}: ${group.detail}`));
    if (lines.length === 5) break;
  }
  if (!findings.length) {
    const text = review.reviewNarrative?.overallOpinion || review.result || '';
    for (const part of text.split(/\n+|(?<=[.!?])\s+/)) {
      const line = concise(part);
      if (line && !lines.includes(line)) lines.push(line);
      if (lines.length >= 5) break;
    }
  }
  return lines.length ? lines.slice(0, 5) : ['검토 결과 없음'];
}
