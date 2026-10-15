# Expert Drawing Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve drawing review quality by separating coordinate-backed findings from narrative analysis and presenting structured expert review cards.

**Architecture:** Keep the existing Gemini Vision endpoint and page-by-page PDF pipeline, but enforce a strict boundary: only coordinate-backed model findings become drawing pins; narrative findings remain structured dashboard content. Normalize coordinates and group narrative sections by review purpose.

**Tech Stack:** React, TypeScript, Vite, Express, Gemini API, pdfjs-dist, Tailwind utility classes.

## Global Constraints

- Do not generate synthetic drawing pins at arbitrary positions.
- Do not mark unavailable evidence as PASS.
- Keep per-page markup IDs unique.
- Preserve PDF page filtering and selected-file scoping.

### Task 1: Stabilize visual annotation coordinates

**Files:**
- Modify: `src/components/DrawingCanvasPreview.tsx`
- Modify: `src/components/UploadView.tsx`

- [ ] Remove visual offsets from annotation pins so their CSS position equals the normalized AI coordinate.
- [ ] Clamp model coordinates to 0–100 and keep narrative-only findings out of the overlay list.
- [ ] Run `npm run build` and confirm Vite and server bundles succeed.

### Task 2: Present structured AI review results

**Files:**
- Modify: `src/components/DashboardView.tsx`

- [ ] Render overview, checklist items, status, evidence, legal basis, recommendation, construction checks, interface checks, and overall opinion as separate cards.
- [ ] Use distinct status colors for PASS, FAIL, and NEEDS_CONFIRMATION.
- [ ] Run `npm run build` and inspect the generated bundle.

### Task 3: Verify and publish

**Files:**
- No source changes.

- [ ] Inspect `git diff` and ensure only intended files are included.
- [ ] Commit with a focused message.
- [ ] Push `agent/drawing-viewer-b` and deploy production with `npx vercel --prod --yes`.
