# 도면 검토 UI 정리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 통합 보고서·AI 검토 표·도면 줌·주석 연결·법규 Evidence를 일관된 검토 워크스페이스로 제공한다.

**Architecture:** 기존 React 상태와 컴포넌트를 유지하면서 `ReportView`, `DashboardView`, `DrawingCanvasPreview`, `ReviewWorkspaceModal`의 표시 책임을 조정한다. 조문 원문은 기존 `fireRulesFullDb.json`에서 클라이언트 표시용 lookup을 만든다.

**Tech Stack:** React, TypeScript, Tailwind CSS, SVG overlay, Vite, existing PDF rendering.

## Global Constraints

- 로컬 테스트만 수행하며 Vercel 배포는 하지 않는다.
- 도면 좌표는 0–100 정규화 좌표를 사용한다.
- 조문 원문을 찾지 못하면 내용을 추정하지 않는다.

### Task 1: 구조화된 Evidence lookup과 검토 표 데이터

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/ReviewWorkspaceModal.tsx`

- [ ] Evidence code를 조문 원문과 출처로 매핑한다.
- [ ] 선택 주석 상세 데이터에 조문·원문·URL을 포함한다.
- [ ] 검토 표에서 사용할 공통 셀 타입과 상태 표시를 정리한다.

### Task 2: AI 검토 의견 표 렌더링

**Files:**
- Modify: `src/components/DashboardView.tsx`
- Modify: `src/components/ReportView.tsx`

- [ ] `reviewNarrative.checklistReview`를 표 형태로 렌더링한다.
- [ ] 설계·안전·VE를 색상 구분한 행 그룹으로 표시한다.
- [ ] 인쇄용 1페이지 스타일과 긴 한글 문장 줄바꿈을 추가한다.

### Task 3: 도면 전용 줌과 주석 연결선

**Files:**
- Modify: `src/components/DrawingCanvasPreview.tsx`
- Modify: `src/components/ReviewWorkspaceModal.tsx`

- [ ] Ctrl+휠과 줌 버튼이 도면 transform을 변경하도록 통합한다.
- [ ] 주석과 도면에 동일한 transform을 적용한다.
- [ ] 선택된 주석 위치에서 상세 카드까지 SVG 연결선을 그린다.

### Task 4: 검증 및 로컬 테스트

**Files:**
- Test: `npm run build`

- [ ] 빌드를 실행해 TypeScript와 Vite 결과를 확인한다.
- [ ] 로컬 서버에서 `/api/backend-status`를 확인한다.
- [ ] 도면 워크스페이스·보고서 화면을 열어 표, 줌, Evidence를 확인한다.
- [ ] 변경 파일만 커밋하고 GitHub에 푸시한다. 배포하지 않는다.
