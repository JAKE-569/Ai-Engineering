# 도면 검토 워크스페이스 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좌측 메뉴 중심의 전문 검토 워크스페이스, 실제 도면 미리보기, 원가절감 상세 팝업을 구현한다.

**Architecture:** 기존 React 상태와 컴포넌트를 유지하면서 Header, DashboardView, CostVeView의 책임만 조정한다. 업로드 시 생성된 `fileDataUrl`, `markups`, `veItems`를 화면에 직접 연결하고, 원가절감 상세는 선택된 `VeItem`을 기반으로 한 로컬 모달로 표시한다.

**Tech Stack:** React, TypeScript, Tailwind CSS, pdf.js, Vite, Vercel.

## Global Constraints

- 새로고침 시 업로드 데이터는 저장하지 않는다.
- API 키와 민감정보를 코드나 UI에 출력하지 않는다.
- 실제 업로드 파일의 원본 데이터가 있을 때 예시 도면이나 고정 의견으로 대체하지 않는다.

---

### Task 1: 상단·좌측 내비게이션 통합

**Files:** `src/components/Header.tsx`

- [ ] Header의 `<nav>` 페이지 탭 블록을 제거한다.
- [ ] 브랜드와 검색, `AI 사용량`, 연결 상태, 사용자 액션만 유지한다.
- [ ] `npm run build`를 실행해 Header props 누락이 없는지 확인한다.

### Task 2: 실제 도면을 검토 캔버스에 연결

**Files:** `src/components/DashboardView.tsx`, `src/components/DrawingCanvasPreview.tsx`, `src/components/PdfViewerModal.tsx`

- [ ] 선택된 `ReviewItem`에 `fileDataUrl` 또는 `cadUrl`이 없으면 연결된 `uploadFiles`에서 동일 파일명을 찾아 원본 URL을 가져온다.
- [ ] 이미지 원본은 `DrawingCanvasPreview`의 이미지 레이어로 표시한다.
- [ ] PDF 선택 시 `PdfViewerModal`을 열고 업로드 원본 URL을 전달한다.
- [ ] `markups`의 `xPercent`, `yPercent`를 원본 도면 위에 표시하고 우측 검토 정보와 동일한 ID를 사용한다.
- [ ] 원본 URL이 없는 경우에만 “도면 원본 없음” 상태를 표시한다.
- [ ] `npm run build`를 실행한다.

### Task 3: 원가절감 결과와 상세 팝업

**Files:** `src/components/CostVeView.tsx`, `src/types.ts`

- [ ] `VeItem`에 선택적 `detailItems` 필드를 추가한다: `{ label: string; quantity?: string; unitPrice?: number; amount?: number; formula?: string }[]`.
- [ ] 업로드 결과의 `veItems`가 없는 경우 고정 예시를 자동으로 합치지 않고 빈 상태와 업로드 안내를 표시한다.
- [ ] 각 VE 행에 `세부 내역` 버튼을 추가하고 `selectedVeItem` state를 설정한다.
- [ ] 팝업에 기존비용, 변경비용, 절감액, 절감률, 기간 단축, 산출 근거, 세부 항목과 계산식을 표시한다.
- [ ] 팝업 닫기와 ESC 접근성을 제공한다.
- [ ] `npm run build`를 실행한다.

### Task 4: 통합 검증 및 배포

**Files:** `src/App.tsx`, modified files above

- [ ] `npm run build`를 실행해 클라이언트·서버 번들을 검증한다.
- [ ] Vercel Production 배포를 실행하고 `READY` 상태와 production alias를 확인한다.
- [ ] 브라우저에서 상단 탭 제거, 도면 표시, VE 상세 팝업을 확인한다.
- [ ] 변경 파일만 커밋하고 현재 브랜치에 push한다.
