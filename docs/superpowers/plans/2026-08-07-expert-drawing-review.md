# Expert Drawing Review Implementation Plan

**Goal:** Strengthen drawing review with structured evidence, fire-protection rule checks, and cross-page consistency signals.

**Architecture:** Gemini Vision remains responsible for image interpretation. The server prompt requires structured findings and a fire-specific checklist; the client preserves page-level findings and displays legal basis, evidence, confidence, and confirmation status.

**Tech Stack:** Express, Google Gemini SDK, TypeScript, React, Vite.

## Global Constraints

- Do not invent a defect when the drawing evidence is unreadable; return `NEEDS_CONFIRMATION`.
- Keep OCR as an internal analysis input; surface legal basis and evidence in the review UI.
- Preserve PDF page numbers and normalized coordinates for every markup.
- Run `npm run build` before commit and deployment.

### Task 1: Structured review contract

**Files:** `server.ts`, `src/types.ts`

- Add explicit fields for finding status, evidence, legal basis, confidence, and confirmation requirement.
- Require Gemini to return these fields for markups, design errors, safety items, and VE items.

### Task 2: Fire-protection expert rules

**Files:** `server.ts`

- Apply the provided fire checklist only when `tradeCategory === '소방'`.
- Require PASS/FAIL/NEEDS_CONFIRMATION for completeness, legal applicability, architectural coordination, water systems, life safety, smoke control, cause-and-effect, and maintenance.
- Require immediate reject/supplement flags to cite evidence.

### Task 3: Cross-page review signals

**Files:** `server.ts`, `src/components/UploadView.tsx`

- Preserve page numbers while merging page results.
- Add a server-side review instruction for inconsistent title blocks, revision numbers, floor/area/use, quantities, and system schedules.

### Task 4: UI evidence display

**Files:** `src/components/ReviewWorkspaceModal.tsx`

- Show legal/technical clause, observed evidence, page, severity, and confidence for the selected markup.

### Task 5: Verification and release

- Run `npm run build`.
- Commit the implementation.
- Push the current branch and deploy the production alias.
