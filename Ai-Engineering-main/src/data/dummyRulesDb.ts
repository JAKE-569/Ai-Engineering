export type RuleSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface EngineeringRule {
  id: string;
  trade: string[];
  keywords: string[];
  code: string;
  title: string;
  checkCondition: (text: string) => RuleCheckResult;
  severity: RuleSeverity;
  source: { title: string; url: string; publisher: string; accessedAt: string; effectiveDate?: string };
}

export interface RuleCheckResult {
  matched: boolean;
  status: 'FAIL' | 'NEEDS_CONFIRMATION';
  evidence: string;
  recommendation: string;
}

const numberAfter = (text: string, pattern: RegExp) => {
  const match = text.match(pattern);
  return match ? Number(match[1]) : undefined;
};

export const dummyRulesDb: EngineeringRule[] = [
  {
    id: 'fire-gas-leak-detector', trade: ['소방', '건축기계', '건축전기'], keywords: ['가스누설경보기', '가스누설', '가스', '누설경보기', '가스화재'], code: 'NFPC 206 / NFTC 206', title: '가스누설경보기 설치·전원·경보 연동', severity: 'CRITICAL',
    source: { title: '가스누설경보기의 화재안전성능기준(NFPC 206)', url: 'https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000216098&lsId=76070&chrClsCd=010202', publisher: '국가법령정보센터·소방청', accessedAt: '2026-08-10', effectiveDate: '2022-11-25' },
    checkCondition: (text) => ({ matched: /가스누설경보기|가스누설|가스화재/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '가스 또는 가스누설경보기 관련 정보가 확인되었습니다.', recommendation: '검지기 설치 위치·경계구역·경보농도·수신반 연동·비상전원·차단밸브 연동을 NFPC 206 및 NFTC 206 원문과 대조하십시오.' }),
  },
  {
    id: 'fire-sprinkler-spacing', trade: ['소방'], keywords: ['스프링클러', '헤드', '살수', '방사'], code: 'NFTC 103 / NFPC 103', title: '스프링클러 헤드 수평거리 및 살수장애', severity: 'CRITICAL',
    source: { title: '스프링클러설비의 화재안전성능기준(NFPC 103)', url: 'https://www.law.go.kr/LSW/admRulLsInfoP.do?admRulId=35312&efYd=0', publisher: '국가법령정보센터·소방청', accessedAt: '2026-08-10', effectiveDate: '2026-03-01' },
    checkCondition: (text) => { const distance = numberAfter(text, /(?:거리|간격|R\s*=)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*m/i); return distance !== undefined && distance > 2.3 ? { matched: true, status: 'FAIL', evidence: `도면/문서에서 ${distance}m 값이 확인되어 기준 2.3m 이하를 초과할 가능성이 있습니다.`, recommendation: '헤드 간격·보호면적·장애물 조건을 재산정하고 평면도와 수리계산서를 보완하십시오.' } : { matched: false, status: 'NEEDS_CONFIRMATION', evidence: '헤드 간격 또는 살수반경 수치가 명확히 추출되지 않았습니다.', recommendation: '헤드 배치도와 수리계산서에서 최대 수평거리를 확인하십시오.' }; },
  },
  {
    id: 'fire-extinguisher', trade: ['소방'], keywords: ['소화기', 'ABC', '분말'], code: 'NFPC 101', title: '소화기구 설치 및 배치', severity: 'WARNING',
    source: { title: '소화기구 및 자동소화장치의 화재안전성능기준(NFPC 101)', url: 'https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000216118&chrClsCd=010201', publisher: '국가법령정보센터·소방청', accessedAt: '2026-08-10', effectiveDate: '2022-12-01' },
    checkCondition: (text) => ({ matched: /소화기|ABC|분말/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '소화기 관련 표기 또는 설치 대상 공간이 확인되었습니다.', recommendation: '소화기 수량·능력단위·보행거리·표지 및 기존품 재사용 여부를 확인하십시오.' }),
  },
  {
    id: 'electrical-separation', trade: ['건축전기', '소방'], keywords: ['전기실', '발전기', '케이블', '전선'], code: 'KEC 232', title: '전기설비 배선·이격 및 방화구획 관통', severity: 'CRITICAL',
    source: { title: '한국전기설비규정(KEC)', url: 'https://law.go.kr/LSW/admRulLsInfoP.do?admRulId=62165&efYd=0', publisher: '국가법령정보센터·기후에너지환경부', accessedAt: '2026-08-10', effectiveDate: '2026-01-05' },
    checkCondition: (text) => ({ matched: /전기실|발전기|케이블|전선/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '전기설비 또는 전원 관련 정보가 확인되었습니다.', recommendation: '케이블 허용전류·전선관 충전율·전원 분리·관통부 내화충전 상세를 대조하십시오.' }),
  },
  {
    id: 'building-egress', trade: ['건축', '소방'], keywords: ['피난', '계단', '방화문', '방화구획'], code: '건축법 시행령 제34조·제46조', title: '피난동선 및 방화구획 정합성', severity: 'CRITICAL',
    source: { title: '건축법 시행령 제34조·제46조', url: 'https://www.law.go.kr/법령/건축법시행령', publisher: '국가법령정보센터·국토교통부', accessedAt: '2026-08-10' },
    checkCondition: (text) => ({ matched: /피난|계단|방화문|방화구획/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '피난 또는 방화구획 관련 정보가 확인되었습니다.', recommendation: '건축도·소방도·문일람표의 계단, 방화문, 방화셔터 위치와 성능을 대조하십시오.' }),
  },
  {
    id: 'company-fire-standard', trade: ['소방', '건축기계'], keywords: ['배관', '밸브', '펌프', '수원'], code: '회사 내부설계표준 F-STD-001', title: '소방 배관·밸브·펌프 표준 적용', severity: 'WARNING',
    source: { title: '회사 내부설계표준 F-STD-001', url: '', publisher: '프로젝트 내부 기준(사용자 제공 필요)', accessedAt: '2026-08-10' },
    checkCondition: (text) => ({ matched: /배관|밸브|펌프|수원/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '소방 수계통 구성 정보가 확인되었습니다.', recommendation: '회사 표준의 밸브 접근성, 시험배수, 펌프실 점검공간, 태그 규칙을 설계도서와 대조하십시오.' }),
  },
  {
    id: 'kds-structural-clearance', trade: ['토목', '건축'], keywords: ['보', '기둥', '구조', '굴착', '흙막이'], code: 'KDS 21 30 00 / KDS 11 10 00', title: '구조·토공 간섭 및 안전성', severity: 'CRITICAL',
    source: { title: 'KDS 21 30 00 가설 흙막이 설계기준 / KDS 11 00 00 지반 설계기준', url: 'https://www.codil.or.kr/detailAnwGuide.do?nserialno=2434', publisher: '국토교통부·건설기술정보시스템(CODIL)', accessedAt: '2026-08-10' },
    checkCondition: (text) => ({ matched: /보|기둥|구조|굴착|흙막이/i.test(text), status: 'NEEDS_CONFIRMATION', evidence: '구조 또는 토공 관련 정보가 확인되었습니다.', recommendation: '구조계산서·흙막이 계산서·현장 조건과 도면의 치수 및 간섭을 대조하십시오.' }),
  },
];

export function retrieveRules(input: { trade: string; docCategory: string; text?: string; fileName?: string }) {
  const haystack = `${input.trade} ${input.docCategory} ${input.text || ''} ${input.fileName || ''}`.toLowerCase();
  return dummyRulesDb.filter((rule) => rule.trade.includes(input.trade) || rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())));
}

export function runRuleScreening(rules: EngineeringRule[], text: string) {
  return rules.map((rule) => ({ ruleId: rule.id, code: rule.code, title: rule.title, severity: rule.severity, source: rule.source, ...rule.checkCondition(text) }));
}
