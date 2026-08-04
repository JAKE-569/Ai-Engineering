# Drawing Viewer B Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 샘플 PDF·이미지 도면의 업로드, 미리보기, OCR 영역 검토, AI 검토 결과 연결을 개선하고 추후 전문 CAD 기능으로 확장 가능한 도면 뷰어 구조를 만든다.

**Architecture:** 기존 React 화면 흐름을 유지한다. `DrawingCanvasPreview`는 파일 렌더링, 뷰포트 조작, OCR/마크업 오버레이를 분리된 책임으로 다루고, 실제 DWG/DXF 렌더러를 나중에 주입할 수 있는 `DrawingSource` 경계를 둔다. 업로드 파일의 실제 브라우저 데이터 URL과 샘플 결과를 동일한 타입으로 처리한다.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, lucide-react, 브라우저 File API, HTML object/img/SVG.

## Global Constraints

- 원본 ZIP은 보존하고 작업공간의 별도 프로젝트에서 수정한다.
- 실제 CAD 변환 서버는 이번 범위에 포함하지 않는다.
- PDF·이미지는 실제 파일 업로드와 미리보기를 지원한다.
- OCR/AI 결과는 신뢰도와 원본 위치를 표시하며 확정 판정이 아닌 검토 후보로 표시한다.
- `bbox`가 없는 샘플 OCR 항목은 기존 fallback 위치로 표시한다.
- 코드의 기존 한글 인코딩 문제를 수정한다.

---

### Task 1: 프로젝트 복사 및 baseline 확인

**Files:**
- Create: `Ai-Engineering-main/` from `Downloads/Ai-Engineering-main.zip`
- Create: `docs/superpowers/plans/2026-08-04-drawing-viewer-b-plan.md`

- [x] ZIP 목록과 기존 도면 뷰어 파일을 확인한다.
- [x] 압축 해제 프로젝트를 작업공간에 복사한다.
- [ ] `npm install` 또는 `bun install` 후 `npm run lint`와 `npm run build` baseline을 실행한다.

### Task 2: 타입과 업로드 모델 정리

**Files:**
- Modify: `Ai-Engineering-main/src/types.ts`
- Modify: `Ai-Engineering-main/src/components/UploadView.tsx`

**Interfaces:**
- `UploadFile.fileDataUrl`은 PDF·이미지 미리보기에 사용한다.
- `OcrBlock.bbox`는 `{ x, y, width, height }` 퍼센트 좌표로 취급한다.
- 업로드 콜백은 기존 `onAddUploadFile(newFile, reviewData)` 계약을 유지한다.

- [ ] 파일 확장자와 MIME 타입을 기준으로 PDF·이미지·CAD를 구분한다.
- [ ] PDF·이미지 파일을 FileReader로 data URL로 변환한다.
- [ ] 허용되지 않은 형식과 파일 크기 초과를 사용자 메시지로 표시한다.
- [ ] CAD 파일은 업로드 목록에 등록하되 뷰어에는 “변환 필요” 상태를 표시할 수 있게 한다.

### Task 3: 도면 뷰포트와 레이어 컨트롤 개선

**Files:**
- Modify: `Ai-Engineering-main/src/components/DrawingCanvasPreview.tsx`

**Interfaces:**
- `DrawingCanvasPreview`는 `fileDataUrl`, `cadUrl`, `ocrBlocks`, `markups`, `highlightError`를 기존처럼 받는다.
- 내부 렌더러는 PDF, image, fallback SVG 세 종류로 분리한다.

- [ ] 줌 인·아웃·초기화에 더해 pointer drag 기반 pan을 구현한다.
- [ ] “화면 맞춤” 버튼과 현재 확대율을 제공한다.
- [ ] OCR, 검토 마크업, 설비/배관 레이어 토글을 유지한다.
- [ ] 이미지와 PDF object를 viewport 컨테이너 안에서 잘리지 않도록 표시한다.
- [ ] C안 확장을 위해 `rendererType`을 PDF/image/fallback/CAD로 구분할 수 있는 내부 구조를 둔다.

### Task 4: OCR bbox 연결 및 선택 상태 연동

**Files:**
- Modify: `Ai-Engineering-main/src/components/DrawingCanvasPreview.tsx`
- Modify: `Ai-Engineering-main/src/components/OcrReviewModal.tsx`

**Interfaces:**
- `OcrReviewModal`의 OCR 목록 선택은 `selectedBlockId`를 관리한다.
- 선택된 OCR ID를 `DrawingCanvasPreview`에 전달해 해당 bbox를 강조한다.

- [ ] `bbox`가 있는 OCR 블록을 실제 퍼센트 위치와 크기로 렌더링한다.
- [ ] OCR 목록 클릭 시 도면 영역을 강조하고 자동으로 해당 위치를 표시한다.
- [ ] 도면 OCR 영역 클릭 시 오른쪽 목록의 해당 항목을 선택한다.
- [ ] OCR 신뢰도를 색상 배지로 표시한다.
- [ ] bbox가 없는 모의 데이터는 기존 자동 배치 fallback으로 표시한다.

### Task 5: AI 분석 상태와 결과 근거 표시

**Files:**
- Modify: `Ai-Engineering-main/src/components/OcrReviewModal.tsx`
- Modify: `Ai-Engineering-main/src/types.ts`

- [ ] OCR 완료, AI 분석 중, 분석 완료, 실패 상태를 표시한다.
- [ ] AI 분석 실행 버튼을 누르면 샘플 응답을 비동기적으로 표시한다.
- [ ] 결과마다 검토 유형, 신뢰도, 근거 문장, 원본 페이지·영역, 추천 조치를 표시한다.
- [ ] “AI 확정 판정”이 아니라 “엔지니어 검토 후보”라는 안내를 표시한다.
- [ ] 실패 상태에서 재실행 버튼을 제공한다.

### Task 6: 인코딩 및 사용자 안내 정리

**Files:**
- Modify: all affected `src/components/*.tsx`
- Modify: `Ai-Engineering-main/src/index.css`

- [ ] 깨진 한글 문자열을 정상적인 UTF-8 한국어로 수정한다.
- [ ] 버튼·상태·오류 메시지·파일 유형 라벨을 일관된 한국어로 정리한다.
- [ ] 도면이 실제 CAD 변환 전 상태일 때 사용자에게 제한사항을 알린다.

### Task 7: 검증

**Files:**
- Test: `Ai-Engineering-main` project build and lint output

- [ ] `npm run lint` 실행 후 TypeScript 오류를 모두 해결한다.
- [ ] `npm run build` 실행 후 Vite와 server bundle이 성공하는지 확인한다.
- [ ] 브라우저에서 업로드 → 미리보기 → OCR 모달 → OCR 항목 선택 → AI 분석 흐름을 확인한다.
- [ ] PDF, 이미지, 잘못된 파일 형식, 파일 미리보기 실패 상태를 확인한다.
- [ ] 수정 파일 목록을 확인하고 원본 ZIP이 변경되지 않았는지 확인한다.
