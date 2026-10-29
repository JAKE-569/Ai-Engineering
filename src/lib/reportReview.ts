import type { ReviewItem, DesignErrorItem, SafetyItem, VeItem } from '../types';
import { classifyFinding, ReviewSeverity } from './reviewClassification';
import { opinionEvidence, veCostText } from './veCost';

export type ConfirmationChoice = 'confirm' | 'non-confirm';
export interface OpinionConfirmation { choice: ConfirmationChoice; fingerprint: string; updatedAt: string; }
export interface ReportRow {
  key: string;
  reviewId: string;
  fileName: string;
  pageNumber?: number;
  category: string;
  opinion: string;
  evidence: string;
  basis: string;
  action: string;
  verdict: string;
  severity: ReviewSeverity;
  fingerprint: string;
  confirmation: ConfirmationChoice | null;
}

const categoryName = (value: string) => /안전|법규|safety/i.test(value) ? '안전' : /VE|원가|절감/i.test(value) ? '원가·VE' : '설계';
const disposition = (item: Record<string, any>) => { const result = classifyFinding(item); return { severity: result.severity, verdict: result.findingStatus }; };
export function buildReportRows(reviews: ReviewItem[], design: DesignErrorItem[] = [], safety: SafetyItem[] = [], ve: VeItem[] = [], includeAppropriate = false): ReportRow[] {
  return reviews.flatMap(review => {
    const belongs = (item: any) => item.documentId ? item.documentId === review.documentId : (item.fileName || item.dwgFile) === review.fileName;
    // Markups are the canonical opinion list, including opinions without coordinates.
    // Domain cards contain copies of these opinions and must not be counted again.
    const items = review.markups?.length ? review.markups.map(item => ({
      key: `markup:${item.id}`, category: categoryName(item.category || ''), pageNumber: item.pageNumber,
      opinion: item.comment || item.title, evidence: opinionEvidence(item), basis: item.codeClause || '',
      action: item.correctiveAction || '', ...disposition(item),
    })) : [
      ...design.filter(belongs).map(item => ({ key: `design:${item.id}`, category: '설계', pageNumber: item.pageNumber, opinion: item.description, evidence: item.evidence || '', basis: item.codeClause || '', action: item.suggestedFix || '', ...disposition(item) })),
      ...safety.filter(belongs).map(item => ({ key: `safety:${item.id}`, category: '안전', pageNumber: (item as any).pageNumber, opinion: item.details || item.summary, evidence: item.evidence || '', basis: item.lawRegulation || '', action: item.requiredConfirmation || '', ...disposition(item) })),
      ...ve.filter(belongs).map(item => ({ key: `ve:${item.id}`, category: '원가·VE', pageNumber: (item as any).pageNumber, opinion: item.description, evidence: [item.evidence, veCostText(item)].filter(Boolean).join('\n\n'), basis: item.calculationBasis || '', action: item.subDescription || '', ...disposition(item) })),
    ];
    const seen = new Set<string>();
    return items.filter(item => (includeAppropriate || item.severity !== 'INFO') && !seen.has(item.key) && !!seen.add(item.key)).map(item => {
      // A changed opinion must be reviewed again even when its ID is reused.
      const fingerprint = JSON.stringify([item.category, item.pageNumber ?? null, item.opinion, item.evidence, item.basis, item.action, item.verdict, item.severity]);
      const saved = review.opinionConfirmations?.[item.key];
      const confirmation = saved?.fingerprint === fingerprint && ['confirm', 'non-confirm'].includes(saved.choice) ? saved.choice : null;
      return { ...item, reviewId: review.id, fileName: review.fileName, fingerprint, confirmation };
    });
  });
}
export const isReportApproved = (rows: ReportRow[]) => rows.length > 0 && rows.every(row => row.confirmation === 'confirm');
export function isReviewSetApproved(reviews: ReviewItem[], rows: ReportRow[]): boolean {
  if (rows.length) return isReportApproved(rows);
  return reviews.length > 0 && reviews.every(review => review.execution?.state === 'complete' &&
    !!review.markups?.length && review.markups.every(item => classifyFinding(item).severity === 'INFO'));
}

// Group a bulk operation by document so one save never overwrites another row's selection.
export function confirmationUpdates(reviews: ReviewItem[], rows: ReportRow[], checked: boolean): ReviewItem[] {
  const now = new Date().toISOString();
  return reviews.flatMap(review => {
    const targets = rows.filter(row => row.reviewId === review.id && (checked ? row.confirmation !== 'confirm' : row.confirmation !== null));
    if (!targets.length) return [];
    const opinionConfirmations = { ...review.opinionConfirmations };
    for (const row of targets) {
      if (checked) opinionConfirmations[row.key] = { choice: 'confirm', fingerprint: row.fingerprint, updatedAt: now };
      else delete opinionConfirmations[row.key];
    }
    return [{ ...review, opinionConfirmations }];
  });
}
