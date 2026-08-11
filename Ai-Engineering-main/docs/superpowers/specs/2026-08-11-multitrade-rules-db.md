# 토목·건축·건축기계·건축전기 법규 DB 설계

## 범위

기존 소방 규칙 DB와 동일한 RAG 인터페이스에 네 개 공종의 검색 규칙과 조문 원문 메타데이터를 추가한다.

## 구성

- `src/data/tradeRulesDb.ts`: 공종, 키워드, 조항 코드, 심각도, checkCondition, 공식 출처를 포함한 검색·수치 검증 규칙
- `src/data/tradeRulesFullDb.json`: KDS, 건축법, 기계설비법, KEC 관련 조항 원문 요약과 출처
- `dummyRulesDb.retrieveRules`: 소방·타 공종 규칙을 함께 검색
- `server.ts`: 검색된 타 공종 조문을 Gemini Context에 주입

## 검증

토목·건축·건축기계·건축전기 입력 각각에 대해 신규 규칙이 검색되고, `npm run build`가 성공해야 한다. 법규 문구는 공식 출처 URL과 함께 표시하며, 도면 근거가 부족한 항목은 `NEEDS_CONFIRMATION`으로 반환한다.
