// Compatibility cleanup for records saved before document cross-review was removed.
export function removeRetiredCrossReview<T>(value: T): T {
  if (Array.isArray(value)) return value.filter(item => !item?.crossReview).map(removeRetiredCrossReview) as T;
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, any>;
  const removedIds = new Set((Array.isArray(record.markups) ? record.markups : []).filter((m: any) => m?.crossReview).map((m: any) => `markup:${m.id}`));
  return Object.fromEntries(Object.entries(record).filter(([key]) => !['reviewSetId', 'reviewSetName', 'structuralReview'].includes(key)).map(([key, data]) => [key,
    key === 'opinionConfirmations' && data ? Object.fromEntries(Object.entries(data).filter(([id]) => !removedIds.has(id))) : removeRetiredCrossReview(data)
  ])) as T;
}
