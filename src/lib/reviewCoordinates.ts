export function coordinate(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : undefined;
}
export function hasCoordinates(item: { xPercent?: unknown; yPercent?: unknown }): boolean {
  return coordinate(item.xPercent) !== undefined && coordinate(item.yPercent) !== undefined;
}
