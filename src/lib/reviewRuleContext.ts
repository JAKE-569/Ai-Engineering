import { retrieveRules, type EngineeringRule } from '../data/dummyRulesDb.js';

// A trade or a model-generated recommendation alone is not source evidence.
export function sourceReviewRules(trade: string, text: string): EngineeringRule[] {
  const source = text.toLowerCase();
  return retrieveRules({ trade, docCategory: '', text }).filter(rule => {
    const explicitCode = rule.code.split(/\s*\/\s*/).some(code => source.includes(code.toLowerCase()));
    return explicitCode || (rule.trade.includes(trade) && rule.keywords.some(keyword => source.includes(keyword.toLowerCase())));
  });
}

export function sourceReviewClauses(clauses: any[], rules: EngineeringRule[], text: string, limit = 12) {
  const source = text.toLowerCase();
  const codes = new Set(rules.flatMap(rule => rule.code.split(/\s*\/\s*/)));
  const terms = [...new Set(source.split(/[^\p{L}\p{N}]+/u))].filter(term => term.length >= 2 && /\p{L}/u.test(term));
  return clauses.filter(clause => clause.text && clause.sourceStatus !== 'SOURCE_ONLY' && (codes.has(clause.code) || source.includes(String(clause.code).toLowerCase())))
    .map(clause => ({ clause, score: terms.reduce((score, term) => score + (String(clause.text).toLowerCase().includes(term) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score).slice(0, limit)
    .map(({ clause }) => ({ code: clause.code, title: clause.clause, text: clause.text, sourceStatus: clause.sourceStatus, source: { title: clause.code, url: clause.sourceUrl, publisher: clause.publisher } }));
}
