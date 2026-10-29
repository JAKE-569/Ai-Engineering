import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportRows, isReportApproved, confirmationUpdates } from '../src/lib/reportReview';

const review = (id = 'review-1'): any => ({ id, documentId: id, fileName: 'drawing.pdf', markups: Array.from({ length: 10 }, (_, i) => ({ id: `opinion-${i}`, title: `title ${i}`, comment: `opinion ${i}`, evidence: `evidence ${i}`, category: i === 0 ? '안전' : '설계', pageNumber: 1, findingStatus: 'NEEDS_CONFIRMATION' })) });
test('report uses the complete canonical opinion list without duplicate domain copies', () => {
  const item = review();
  const rows = buildReportRows([item], [{ id: 'duplicate', documentId: item.documentId, description: 'opinion 0' } as any]);
  assert.equal(rows.length, 10);
  assert.equal(rows[0].category, '안전');
  assert.equal(rows[0].confirmation, null);
  assert.equal(isReportApproved(rows), false);
  assert.equal(isReportApproved([]), false);
});
test('all current opinions must be confirmed; changes, non-confirm and new rows revoke approval', () => {
  const item = review(); const rows = buildReportRows([item]);
  item.opinionConfirmations = Object.fromEntries(rows.map(row => [row.key, { choice: 'confirm', fingerprint: row.fingerprint, updatedAt: '2026-10-26' }]));
  assert.equal(isReportApproved(buildReportRows([item])), true);
  item.opinionConfirmations[rows[0].key].choice = 'non-confirm';
  assert.equal(isReportApproved(buildReportRows([item])), false);
  item.opinionConfirmations[rows[0].key].choice = 'confirm';
  item.markups[0].comment = 'Changed review opinion';
  assert.equal(buildReportRows([item])[0].confirmation, null);
  assert.equal(isReportApproved(buildReportRows([item])), false);
  assert.equal(isReportApproved(buildReportRows([review('new-document'), item])), false);
});
test('confirmations are isolated between same-name documents with the same markup IDs', () => {
  const first = review(); const second = review('review-2'); const rows = buildReportRows([first]);
  first.opinionConfirmations = Object.fromEntries(rows.map(row => [row.key, { choice: 'confirm', fingerprint: row.fingerprint, updatedAt: '' }]));
  const combined = buildReportRows([first, second]);
  assert.equal(combined.filter(row => row.confirmation === 'confirm').length, 10);
  assert.equal(combined.length, 20);
  assert.equal(isReportApproved(combined), false);
});

test('bulk confirm groups every opinion by document and preserves unrelated data', () => {
  const first = review(); const second = review('review-2');
  first.engineerNotes = 'keep these notes';
  const rows = buildReportRows([first, second]);
  const updates = confirmationUpdates([first, second], rows, true);
  assert.equal(updates.length, 2);
  assert.equal(updates[0].engineerNotes, first.engineerNotes);
  assert.equal(first.opinionConfirmations, undefined);
  assert.equal(isReportApproved(buildReportRows(updates)), true);
  assert.equal(confirmationUpdates(updates, buildReportRows(updates), true).length, 0);
  // A failed save for the second document must keep the report unapproved.
  const partial = [updates[0], second];
  assert.equal(isReportApproved(buildReportRows(partial)), false);
  assert.equal(confirmationUpdates(partial, buildReportRows(partial), true).length, 1);
  const cleared = confirmationUpdates(updates, [buildReportRows(updates)[0]], false);
  assert.equal(cleared.length, 1);
  assert.equal(Object.keys(cleared[0].opinionConfirmations!).length, 9);
  assert.equal(isReportApproved(buildReportRows([cleared[0], updates[1]])), false);
});
