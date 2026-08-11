import tradeRulesFullDb from './tradeRulesFullDb.json';
import type { EngineeringRule } from './dummyRulesDb';
import { tradeRulesDb } from './tradeRulesDb';

export type ConstructionStandardType = 'KDS' | 'KCS' | 'LAW' | 'KEC';
export interface ConstructionClause {
  code: string;
  standardType: ConstructionStandardType;
  trade: string;
  clause: string;
  text: string;
  sourceUrl: string;
  publisher: string;
  sourceStatus: 'FULL_TEXT' | 'SOURCE_ONLY';
}

const families: ConstructionClause[] = [
  ['KDS 10 00 00', '공통', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 10 00 00', '공통', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 11 00 00', '지반', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 11 00 00', '지반', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 14 00 00', '구조', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 14 00 00', '구조', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 21 00 00', '가설', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 21 00 00', '가설', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 31 00 00', '기계설비', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 31 00 00', '기계설비', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 32 00 00', '전기설비', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 32 00 00', '전기설비', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 41 00 00', '건축', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 41 00 00', '건축', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 44 00 00', '도로', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 44 00 00', '도로', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 47 00 00', '철도', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 47 00 00', '철도', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KDS 51 00 00', '하천', 'https://www.codil.or.kr/', '국가건설기준센터'],
  ['KCS 51 00 00', '하천', 'https://www.codil.or.kr/', '국가건설기준센터'],
].map(([code, trade, sourceUrl, publisher]) => ({ code, standardType: code.startsWith('KDS') ? 'KDS' : 'KCS', trade, clause: `${code} 기준서 원문 수집 대상`, text: '', sourceUrl, publisher, sourceStatus: 'SOURCE_ONLY' } as ConstructionClause));

export const constructionRulesFullDb = {
  sources: [...tradeRulesFullDb.sources, ...families.map(({ code, trade, sourceUrl, publisher }) => ({ code, trade, title: `${code} 기준서`, sourceUrl, publisher }))],
  clauses: [...tradeRulesFullDb.clauses.map((clause) => ({ ...clause, standardType: clause.code.startsWith('KDS') ? 'KDS' : clause.code.startsWith('KEC') ? 'KEC' : 'LAW', trade: '건설기준', sourceStatus: 'FULL_TEXT' as const })), ...families],
  rules: tradeRulesDb as EngineeringRule[],
};

export default constructionRulesFullDb;
