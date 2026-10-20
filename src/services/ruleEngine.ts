import { runRuleScreening } from '../data/dummyRulesDb';

export { runRuleScreening };

export function buildRuleEvidence(result: any[]) {
  return result.map((item) => ({ ruleId: item.ruleId || item.id, code: item.code, status: item.status, evidence: item.evidence, recommendation: item.recommendation }));
}
