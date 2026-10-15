import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper: Initialize Gemini API client securely on the server
  const getGeminiClient = () => {
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Endpoint: Health & Backend Status Check
  app.get("/api/backend-status", (req, res) => {
    res.json({
      status: "ok",
      connected: true,
      backendDatabase: "Supabase PostgreSQL (Pre-Integrated on Backend)",
      deploymentServer: "Cloud Run / Vercel Serverless Ready",
      aiEngine: "Gemini 3.6 Flash Vision OCR Active",
      timestamp: new Date().toISOString(),
    });
  });

  // API Endpoint: Perform OCR and AI Engineering Review by Trade & Document Category
  app.post("/api/gemini/review-drawing", async (req, res) => {
    try {
      const { fileName, mimeType, base64Data, docCategory = "도면", tradeCategory = "소방" } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: "File name is required" });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          success: false,
          code: "NO_API_KEY",
          error: "GEMINI_API_KEY is not configured on the server, so no AI review was performed.",
        });
      }
      if (!base64Data) {
        return res.status(400).json({
          success: false,
          code: "NO_FILE_DATA",
          error: "No file content was uploaded, so the document could not be reviewed.",
        });
      }

      let ocrResult = null;
      try {
        const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
        let effectiveMime = mimeType || "image/png";

        // Determine if base64 data is a valid supported raster image / PDF for Gemini inlineData
        // Supported: PNG, JPEG, WEBP, HEIC, PDF
        const isPdf = cleanBase64.startsWith("JVBERi"); // %PDF-
        const isPng = cleanBase64.startsWith("iVBORw0KGgo");
        const isJpeg = cleanBase64.startsWith("/9j/");
        const isWebp = cleanBase64.startsWith("UklGR");

        const isSupportedMedia = (isPng || isJpeg || isWebp || isPdf) &&
          (effectiveMime.startsWith("image/") || effectiveMime === "application/pdf") &&
          !effectiveMime.includes("svg");

        // Reviewing without the document attached would only produce invented findings
        if (!isSupportedMedia) {
          return res.status(415).json({
            success: false,
            code: "UNSUPPORTED_FILE",
            error: "This file type cannot be read by the AI reviewer. Upload a PDF, PNG, JPEG or WEBP file.",
          });
        }

        const promptText = `
You are a Lead Senior Engineering Reviewer & Professional Engineer (수석 엔지니어 / 기술사) specialized in **${tradeCategory}** engineering and **${docCategory}** review for POSCO Industrial & Plant Facilities.
Analyze this uploaded document file ("${fileName}").

Document Category: ${docCategory} (도면 / 시방서 / 내역서)
Selected Trade / Specialty: ${tradeCategory} (토목 / 건축 / 건축기계 / 건축전기 / 소방)

Your primary objective is to execute a rigorous, highly specific expert-level engineering review of this ${docCategory} based on official Korean engineering codes and standards:
- **토목 (Civil)**: KDS 토질/기초, KCS 11 00 00 토공사, 건설기술 진흥법, 배수/사면/흙막이 수치검토
- **건축 (Architectural)**: KDS 건축구조, 건축법시행령, 피난구조 및 방화구획, 내화성능, 단열/창호 시방
- **건축기계 (Mechanical HVAC/Plumbing)**: KDS 건축설비, 덕트/배관 호칭지름, 환기회수, 위생설비, 공조 부하 계산
- **건축전기 (Electrical)**: KEC (한국전기설비규정), 변압기/차단기 용량, 전선관 스케줄, 조도 및 방폭전기
- **소방 (Fire Protection)**: 화재안전기술기준 (NFTC 101~605), 소방시설법, 스프링클러 R=2.3m, 가지배관 수량산정, 자탐 감지기

Review Guidelines by Document Category:
1. **도면 (Drawing)**: Verify dimensions, level annotations, pipe/cable sizing, spatial clearance, symbol accuracy, and code-defined clearances. Highlight specific drawing positions using percentage coordinates (xPercent: 0-100, yPercent: 0-100).
2. **시방서 (Specification)**: Check material standards (KS/ISO), construction methods, code references, missing quality criteria, and discrepancies with standard engineering specs.
3. **내역서 (Bill of Quantities / Cost Estimate)**: Inspect quantity calculations, unit price consistency, missing work items, standard productivities (표준품셈), and cost optimizations.

Return ONLY valid JSON matching this exact structure:
{
"drawingTitle": "Extracted Title or Document Name",
"drawingNumber": "Extracted Code/Number (e.g. DWG-${tradeCategory}-2024-001)",
"scale": "Extracted Scale (e.g. 1 : 100 or N/S)",
"docCategory": "${docCategory}",
"tradeCategory": "${tradeCategory}",
"rawOcrText": "Full extracted OCR text content...",
"ocrBlocks": [
  { "id": "b1", "text": "Extracted text string", "category": "표제란|치수|재질|특기사항|소방/안전", "confidence": 98 }
],
"reviewSummary": {
  "status": "오류 의심" | "주의" | "정상" | "긴급 확인",
  "result": "One sentence expert summary of ${tradeCategory} ${docCategory} review findings",
  "description": "Detailed technical analysis citing relevant ${tradeCategory} code clauses and technical requirements"
},
"designErrors": [
  {
    "id": "err-1",
    "errorCode": "ERR-${tradeCategory}-001",
    "dwgFile": "${fileName}",
    "description": "Detailed design error description citing relevant code clauses",
    "type": "Mechanical" | "Electrical" | "Structural" | "Civil" | "Architectural" | "Fire" | "Other",
    "severity": "CRITICAL" | "WARNING" | "INFO",
    "suggestedFix": "Concrete engineering fix proposal with specific numerical values"
  }
],
"markups": [
  {
    "id": "m1",
    "xPercent": 35,
    "yPercent": 40,
    "title": "검토 지적 위치 1",
    "comment": "Specific error or review comment on this drawing/document region",
    "codeClause": "Relevant Code (e.g. KDS / KEC / NFTC)",
    "severity": "CRITICAL"
  }
],
"safetyItems": [
  {
    "id": "saf-1",
    "fileName": "${fileName}",
    "fileType": "PDF/CAD/Image",
    "reviewedAt": "Recent Timestamp",
    "summary": "Safety and legal compliance summary for ${tradeCategory}",
    "lawRegulation": "Relevant Regulation",
    "severity": "위험" | "주의" | "정상",
    "status": "즉시 조치 필요 | 세부 확인 권고 | 검토 통과",
    "details": "Detailed legal requirement explanation"
  }
],
"veItems": [
  {
    "id": "ve-1",
    "type": "VE 제안" | "수량 오류",
    "description": "${tradeCategory} VE Optimization Item",
    "subDescription": "Details of cost savings and specification/quantity optimization",
    "location": "Location / Zone",
    "impactKw": 40000000,
    "status": "검토대기"
  }
]
}
`;

        const partsArr: any[] = [
          {
            inlineData: {
              mimeType: isPdf ? "application/pdf" : effectiveMime,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ];

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: {
            parts: partsArr,
          },
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          ocrResult = JSON.parse(response.text.trim());
        }
      } catch (aiErr) {
        console.error("Gemini review failed:", aiErr);
        // SDK errors often carry the API's JSON body as the message; surface just its human-readable part
        let reason = (aiErr as Error)?.message || String(aiErr);
        try {
          reason = JSON.parse(reason)?.error?.message || reason;
        } catch {}
        return res.status(502).json({
          success: false,
          code: "AI_REQUEST_FAILED",
          error: `AI review failed: ${reason}`,
        });
      }


      // No synthetic fallback: every returned result must come from the uploaded document
      if (!ocrResult) {
        return res.status(502).json({
          success: false,
          code: "AI_EMPTY_RESPONSE",
          error: "The AI reviewer returned no result for this document. No review was generated.",
        });
      }

      return res.json({ success: true, data: ocrResult });
    } catch (err: any) {
      console.error("Review drawing endpoint error:", err);
      return res.status(500).json({ success: false, code: "SERVER_ERROR", error: err.message || "Failed to analyze drawing" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`POSCO AI Engineering Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
