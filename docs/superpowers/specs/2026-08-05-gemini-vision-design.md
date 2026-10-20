# Gemini Vision Drawing Review Design

## Goal

Replace NVIDIA Vision as the drawing-analysis provider with Gemini Vision while preserving browser-only source-file handling, PDF conversion, dashboard review records, and real-result-only markups.

## Architecture

The browser reads local image/PDF files as Data URLs. PDF.js renders each page to PNG. The server endpoint sends the converted image to Gemini with a structured visual-review prompt and returns validated JSON. The upload screen maps Gemini findings to review items and coordinates; no hardcoded review opinions are used.

## Success Criteria

- Image uploads are sent to Gemini Vision.
- PDF pages are converted and sent to Gemini Vision.
- Gemini OCR, visual findings, review summary, and markups appear in the dashboard.
- Missing or exhausted Gemini credentials produce a visible review error while preserving the original upload.
- No sample/default markups are rendered.
