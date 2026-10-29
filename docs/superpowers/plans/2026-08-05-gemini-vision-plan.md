# Gemini Vision Drawing Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch drawing review from NVIDIA NIM to Gemini Vision with structured, image-grounded findings.

**Architecture:** Keep PDF.js conversion in the browser. Replace the server provider with Gemini's multimodal API, then map `visualFindings` to UI markups when needed. Preserve upload records on provider failure.

**Tech Stack:** React, Vite, TypeScript, Vercel serverless functions, `@google/genai`, PDF.js.

## Global Constraints

- Never commit API keys.
- Preserve original files only in browser memory; refresh clears data.
- Render only provider-returned findings; no hardcoded review opinions.
- PDF pages are analyzed sequentially, starting with the first page.

### Task 1: Gemini server endpoint

**Files:**
- Modify: `api/gemini/review-drawing.ts`
- Modify: `.env.example`
- Modify: `package.json` and `package-lock.json`

- [ ] Add `@google/genai` if absent and use `GEMINI_API_KEY`.
- [ ] Send `inlineData` with the image MIME type and structured visual-review prompt.
- [ ] Return parsed JSON with `visualFindings`, `markups`, OCR, and summary fields.
- [ ] Return clear 503/429/502 errors without leaking credentials.
- [ ] Run `npm run lint` and `npm run build`.

### Task 2: Client provider payload

**Files:**
- Modify: `src/components/UploadView.tsx`

- [ ] Keep PDF.js conversion and send `mimeType` plus converted image data to `/api/gemini/review-drawing`.
- [ ] Map Gemini `visualFindings` to `markups` when `markups` is empty.
- [ ] Preserve fallback upload and dashboard review records on API failure.
- [ ] Run `npm run lint` and `npm run build`.

### Task 3: Configuration and deployment verification

**Files:**
- Modify: Vercel environment variables through CLI; do not commit secrets.

- [ ] Register `GEMINI_API_KEY` in Vercel Preview and Production.
- [ ] Build with `vercel build --prod` and deploy prebuilt output.
- [ ] Upload a real PDF and image through the deployed app.
- [ ] Verify dashboard result, original preview, and absence of sample markups.

### Task 4: Commit and push

- [ ] Commit the provider switch and configuration changes.
- [ ] Push `agent/drawing-viewer-b`.
