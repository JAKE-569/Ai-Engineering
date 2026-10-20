import type { EngineeringRule, RuleCheckResult } from './dummyRulesDb';

const needsEvidence = (evidence: string, recommendation: string): RuleCheckResult => ({
  matched: true,
  status: 'NEEDS_CONFIRMATION',
  evidence,
  recommendation,
});

const source = (title: string, url: string, publisher: string) => ({ title, url, publisher, accessedAt: '2026-08-11' });

export const tradeRulesDb: EngineeringRule[] = [
  {
    id: 'civil-ground-investigation', trade: ['토목'], keywords: ['지반조사', '지지력', '기초', '말뚝', '지하수'], code: 'KDS 11 10 05', title: '지반조사 및 설계정수 확인', severity: 'CRITICAL',
    source: source('KDS 11 10 05 지반조사', 'https://www.codil.or.kr/', '국가건설기준센터'),
    checkCondition: (text) => needsEvidence(`도면·계산서에서 지반조사 또는 설계지반정수 관련 키워드가 확인되었습니다: ${text.match(/지반조사|지지력|기초|말뚝|지하수/i)?.[0] || '관련 항목'}`, '지반조사보고서, 설계지내력, 지하수위, 기초 형식 및 침하 검토 결과를 구조·토목 계산서와 대조하십시오.'),
  },
  {
    id: 'civil-drainage-slope', trade: ['토목'], keywords: ['우수', '배수', '관로', '구배', '맨홀', '측구'], code: 'KDS 57 65 00', title: '배수계획·관로 구배 및 유지관리성', severity: 'WARNING',
    source: source('KDS 57 65 00 상수도 배수시설 설계기준', 'https://www.codil.or.kr/filebank/moct2014/202203/MOCT2852_1.PDF?nserialno=2852', '국가건설기준센터'),
    checkCondition: () => needsEvidence('우수·배수·관로 요소가 도면에 포함되어 적용 기준 검토가 필요합니다.', '관로 구배, 유량, 맨홀 간격, 역류·침수 가능성 및 유지관리 접근성을 종단·평면도와 함께 확인하십시오.'),
  },
  {
    id: 'civil-earth-retaining', trade: ['토목'], keywords: ['흙막이', '옹벽', '토압', '굴착', '가시설'], code: 'KDS 21 30 00', title: '흙막이·옹벽 안정 및 주변 구조물 영향', severity: 'CRITICAL',
    source: source('KDS 21 30 00 강구조물 설계기준 및 관련 토목 기준', 'https://www.codil.or.kr/', '국가건설기준센터'),
    checkCondition: () => needsEvidence('굴착·옹벽·흙막이 관련 설계요소의 정합성 확인이 필요합니다.', '토압, 배면 배수, 활동·전도·지지력, 인접 구조물 변위 및 계측계획을 구조·토목 설계도서와 대조하십시오.'),
  },
  {
    id: 'architectural-egress', trade: ['건축'], keywords: ['피난', '계단', '출구', '복도', '피난거리', '방화문'], code: '건축법 시행령 제34조·제35조', title: '피난계단·출구 및 피난거리 정합성', severity: 'CRITICAL',
    source: source('건축법 시행령', 'https://www.law.go.kr/법령/건축법시행령', '국가법령정보센터'),
    checkCondition: () => needsEvidence('피난·계단·출구 관련 도면 요소가 확인되어 피난계획 검토가 필요합니다.', '실별 피난거리, 복도 폭, 계단 유효폭, 출구 방향 및 방화문 성능을 건축 평면도·법규 검토서와 대조하십시오.'),
  },
  {
    id: 'architectural-fire-compartment', trade: ['건축'], keywords: ['방화구획', '방화벽', '방화셔터', '방화문', '관통부'], code: '건축법 시행령 제46조', title: '방화구획 및 관통부 계획', severity: 'CRITICAL',
    source: source('건축법 시행령 제46조 방화구획', 'https://www.law.go.kr/법령/건축법시행령', '국가법령정보센터'),
    checkCondition: () => needsEvidence('방화구획·방화문·관통부 관련 요소가 확인되었습니다.', '구획선, 방화문·셔터, 설비 관통부의 내화충전 및 방화댐퍼 범위를 건축·기계·전기 도면에서 일치시켜 확인하십시오.'),
  },
  {
    id: 'architectural-accessibility', trade: ['건축'], keywords: ['장애인', '경사로', '점자', '승강기', '무장애', '접근성'], code: '장애인·노인·임산부 등의 편의증진 보장에 관한 법률', title: '무장애 동선 및 편의시설', severity: 'WARNING',
    source: source('장애인등편의법', 'https://www.law.go.kr/법령/장애인ㆍ노인ㆍ임산부등의편의증진보장에관한법률', '국가법령정보센터'),
    checkCondition: () => needsEvidence('무장애·접근성 관련 공간이 확인되었습니다.', '경사로 기울기, 유효폭, 점자블록, 장애인 화장실 및 승강기 접근 동선을 건축 상세도와 대조하십시오.'),
  },
  {
    id: 'mechanical-ventilation', trade: ['건축기계'], keywords: ['환기', '공조', '덕트', '외기', '배기', '환기량'], code: 'KDS 31 25 10', title: '환기량·덕트계통 및 외기 취입 검토', severity: 'WARNING',
    source: source('KDS 31 25 10 건축기계설비 설계기준', 'https://www.codil.or.kr/', '국가건설기준센터'),
    checkCondition: () => needsEvidence('환기·공조·덕트 요소가 확인되었습니다.', '실별 환기량, 외기·배기 위치, 덕트 압력손실, 소음·진동 및 천장 내 간섭을 기계·건축 천장도와 대조하십시오.'),
  },
  {
    id: 'mechanical-piping', trade: ['건축기계'], keywords: ['배관', '냉온수', '급수', '위생', '펌프', '밸브'], code: 'KDS 31 30 15', title: '기계배관 구경·압력·밸브 및 유지관리', severity: 'CRITICAL',
    source: source('KDS 31 30 15 건축기계설비 배관설비', 'https://www.codil.or.kr/', '국가건설기준센터'),
    checkCondition: () => needsEvidence('기계배관 및 펌프·밸브 요소가 확인되었습니다.', '유량·압력손실·관경·밸브 접근성·배수 및 보온·동파 방지 조건을 계산서와 평면·계통도에서 대조하십시오.'),
  },
  {
    id: 'mechanical-equipment-clearance', trade: ['건축기계'], keywords: ['장비', '기계실', '점검', '유지관리', '펌프실'], code: '기계설비법 시행규칙', title: '기계설비 장비 점검공간 및 유지관리성', severity: 'WARNING',
    source: source('기계설비법 시행규칙', 'https://www.law.go.kr/법령/기계설비법시행규칙', '국가법령정보센터'),
    checkCondition: () => needsEvidence('기계장비·기계실 관련 요소가 확인되었습니다.', '장비 반입·교체 동선, 점검공간, 배수·환기, 방진·방음 및 밸브 조작공간을 건축·구조도와 합동 확인하십시오.'),
  },
  {
    id: 'electrical-grounding', trade: ['건축전기'], keywords: ['접지', '등전위', '피뢰', '누전', '접지극'], code: 'KEC 140·142', title: '접지·등전위 및 피뢰계통', severity: 'CRITICAL',
    source: source('한국전기설비규정 KEC', 'https://kec.kea.kr/', '대한전기협회'),
    checkCondition: () => needsEvidence('접지·피뢰·등전위 관련 요소가 확인되었습니다.', '접지방식, 접지저항, 보호도체, 등전위본딩 및 피뢰설비를 단선결선도·접지계통도·현장시험계획과 대조하십시오.'),
  },
  {
    id: 'electrical-cable-tray', trade: ['건축전기'], keywords: ['케이블', '트레이', '배선', '전선관', '전기실', '간섭'], code: 'KEC 232', title: '배선·케이블 트레이 및 타 공종 간섭', severity: 'WARNING',
    source: source('한국전기설비규정 KEC 232 배선설비', 'https://kec.kea.kr/', '대한전기협회'),
    checkCondition: () => needsEvidence('케이블·트레이·배선 요소가 확인되었습니다.', '케이블 허용전류·전압강하·트레이 충전율·이격·방화구획 관통부와 기계덕트·구조보 간섭을 종합 확인하십시오.'),
  },
  {
    id: 'electrical-emergency-power', trade: ['건축전기'], keywords: ['비상전원', '발전기', 'UPS', '축전지', '소방전원'], code: 'KEC 351·352', title: '비상전원·발전기 및 중요부하 공급', severity: 'CRITICAL',
    source: source('한국전기설비규정 KEC 분산형전원·비상전원 관련 기준', 'https://kec.kea.kr/', '대한전기협회'),
    checkCondition: () => needsEvidence('비상전원·발전기·UPS 관련 요소가 확인되었습니다.', '비상부하 목록, 발전기 용량·기동전류, 연료·환기, 절체시간, 배선 분리 및 소방설비 연동표를 대조하십시오.'),
  },
];
