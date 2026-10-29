import type { VeItem } from '../types';
import { calculateVeCost } from './veCost';

export function veAdoptionFingerprint(item: VeItem) {
  const c = calculateVeCost(item);
  return JSON.stringify([item.documentId, item.id, item.description, c.before, c.after, c.assumed, c.formulas, c.sources, c.missing, item.calculationBasis]);
}
export function isVeAdopted(item: VeItem) {
  return item.adoption?.accepted === true && item.adoption.fingerprint === veAdoptionFingerprint(item) && calculateVeCost(item).state === 'calculated';
}
export function veAdoptionSummary(items: VeItem[]) {
  const adopted = items.filter(isVeAdopted);
  const costs = adopted.map(calculateVeCost);
  const before = costs.reduce((sum, c) => sum + c.before!, 0), after = costs.reduce((sum, c) => sum + c.after!, 0);
  const savings = before - after;
  return { adopted, before, after, savings, rate: before > 0 ? savings / before * 100 : undefined,
    assumedSavings: costs.filter(c => c.assumed).reduce((sum, c) => sum + c.savings!, 0),
    sourcedSavings: costs.filter(c => !c.assumed).reduce((sum, c) => sum + c.savings!, 0), assumedCount: costs.filter(c => c.assumed).length };
}
export function largeVeAmount(amount: number) {
  const divisor = Math.abs(amount) >= 100000000 ? 100000000 : Math.abs(amount) >= 10000 ? 10000 : 1;
  return { value: (amount / divisor).toLocaleString('ko-KR', { maximumFractionDigits: 2 }), unit: divisor === 100000000 ? '억원' : divisor === 10000 ? '만원' : '원' };
}
