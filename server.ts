import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: false });
import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { calculateFireEngineering } from "./src/lib/fireCalculations";
import { retrieveRules, runRuleScreening } from "./src/data/dummyRulesDb";
import fullFireRulesDb from "./src/data/fireRulesFullDb.json";
import fullTradeRulesDb from "./src/data/constructionRulesDb";
import { nvidiaModels, nvidiaRequest } from "./src/config/nvidia";
import { retrieveFromVectorDb } from "./src/services/retrieverService";
import { buildRuleEvidence } from "./src/services/ruleEngine";
import { synthesizeNvidiaReview } from "./src/services/llmService";
import { vectorDbConfig, vectorDbEnabled } from "./src/config/vectorDb";

const NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const writeAiDiagnostic = (event: string, detail: unknown) => {
  try {
    fs.appendFileSync(path.join(process.cwd(), 'ai-review-diagnostics.log'), `${new Date().toISOString()} ${event} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}\n`);
  } catch { /* diagnostics must never interrupt review */ }
};

function nvidiaConfig() {
  if (!process.env.NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY is not configured");
  return {
    baseUrl: (process.env.NVIDIA_BASE_URL || NVIDIA_DEFAULT_BASE_URL).replace(/\/$/, ""),
    apiKey: process.env.NVIDIA_API_KEY,
  };
}

async function nvidiaPost(endpoint: string, body: unknown) {
  const config = nvidiaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NVIDIA_REQUEST_TIMEOUT_MS || 300000));
  try {
    const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`NVIDIA API ${response.status}: ${await response.text()}`);
    return await response.json() as Promise<any>;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new Error(`NVIDIA API timeout after ${process.env.NVIDIA_REQUEST_TIMEOUT_MS || 300000}ms (${endpoint})`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const isNvidiaModel = (model: string) => model.startsWith("nvidia/") || model.startsWith("llama-nemotron");
const nvidiaOnlyModel = (requested: string | undefined, fallback: string) => {
  const selected = requested || fallback;
  return isNvidiaModel(selected) ? selected : fallback;
};
const nvidiaVisionModel = (requested?: string) => requested || process.env.NVIDIA_VISION_MODEL || process.env.NVIDIA_MODEL || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const nvidiaVisionFallbackModel = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";
const nvidiaTextModel = () => nvidiaOnlyModel(process.env.NVIDIA_TEXT_MODEL, "nvidia/nemotron-3-nano-30b-a3b");
const nvidiaEmbeddingModel = () => nvidiaOnlyModel(process.env.NVIDIA_EMBEDDING_MODEL, "nvidia/nemotron-3-embed-1b");

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  let dot = 0; let normA = 0; let normB = 0;
  for (let i = 0; i < length; i += 1) { dot += a[i] * b[i]; normA += a[i] ** 2; normB += b[i] ** 2; }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

async function rerankNvidiaRules(query: string, candidates: any[]) {
  const unique = Array.from(new Map(candidates.map((item) => [`${item.code}-${item.clause || item.id}`, item])).values()).slice(0, 40);
  if (!unique.length) return [];
  try {
    const inputs = [query.slice(0, 3000), ...unique.map((item) => `${item.code || ""} ${item.clause || item.title || ""} ${item.text || ""}`.slice(0, 3000))];
    const embeddingResponse = await nvidiaPost("/embeddings", { model: nvidiaEmbeddingModel(), input: inputs, input_type: "query" });
    const vectors = (embeddingResponse.data || []).map((item: any) => item.embedding as number[]);
    if (!vectors[0]) return unique.slice(0, 12);
    return unique.map((item, index) => ({ item, score: cosineSimilarity(vectors[0], vectors[index + 1] || []) }))
      .sort((a, b) => b.score - a.score).slice(0, 12).map(({ item, score }) => ({ ...item, retrievalScore: Number(score.toFixed(4)) }));
  } catch (error) {
    console.warn("NVIDIA embedding rerank unavailable; using keyword-filtered rules:", (error as Error)?.message || error);
    return unique.slice(0, 12);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Helper: Initialize Gemini API client securely on the server
  const getGeminiClient = () => {
    const vertexProject = process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
    if (vertexProject) {
      // Gemini Enterprise Agent Platform (formerly Vertex AI) uses ADC in
      // production. The SDK discovers credentials from gcloud ADC, an
      // attached service account, or GOOGLE_APPLICATION_CREDENTIALS.
      return new GoogleGenAI({
        vertexai: true,
        project: vertexProject,
        location: process.env.VERTEX_AI_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'global'
      });
    }
    if (!process.env.GEMINI_API_KEY) return null;
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  };

  // Google API model ID for the requested "Gemini 3.0 Flash" line.
  // Google exposes this preview model as gemini-3-flash-preview.
  const getGeminiModel = () => process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT ? (process.env.VERTEX_AI_MODEL || 'gemini-3-flash-preview') : 'gemini-2.0-flash';
const getNvidiaModel = (requested?: string) => requested || process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

function extractModelText(response: any) {
  if (typeof response?.text === 'string' && response.text.trim()) return response.text.trim();
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const text = parts.map((part: any) => typeof part?.text === 'string' ? part.text : '').filter(Boolean).join('\n').trim();
    if (text) return text;
  }
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) return content.trim();
  if (content && typeof content === 'object') return JSON.stringify(content);
  return '';
}

function parseJsonObjectOrNull(text: string) {
  const normalized = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(normalized);
  } catch {
    const firstBrace = normalized.indexOf('{');
    const lastBrace = normalized.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try { return JSON.parse(normalized.slice(firstBrace, lastBrace + 1)); } catch { /* use text fallback */ }
    }
    return null;
  }
}

function isGenericVisionResponse(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return true;
  const genericPatterns = [/여러 가지 기호와 문자가 포함되어 있습니다/gi, /the image contains/gi, /drawing contains/gi, /not provided/gi, /확인 불가/gi];
  const genericHits = genericPatterns.reduce((count, pattern) => count + (normalized.match(pattern) || []).length, 0);
  const repeatedSentence = normalized.match(/(.{8,80})\s+\1/);
  return genericHits >= 3 || Boolean(repeatedSentence) || normalized.length < 40;
}

function localizeVisionUnknowns(value: any): any {
  if (typeof value === 'string') return value.replace(/\bUNREADABLE\b/gi, '확인 불가').replace(/\bNot provided\b/gi, '확인 불가');
  if (Array.isArray(value)) return value.map(localizeVisionUnknowns);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeVisionUnknowns(item)]));
  return value;
}

function normalizeReviewKeys(value: any): any {
  if (Array.isArray(value)) return value.map(normalizeReviewKeys);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const normalizedKey = key.replace(/^[^A-Za-z0-9가-힣]+/, '');
    return [normalizedKey || key, normalizeReviewKeys(item)];
  }));
}

function ensureNvidiaReviewItems(review: any, evidence: string, rules: any[]) {
  const visible = evidence.slice(0, 280).replace(/\s+/g, ' ');
  const basis = rules[0]?.code || '적용 기준 확인 필요';
  if (!Array.isArray(review.designErrors) || review.designErrors.length === 0) {
    review.designErrors = [{ title: '도면 정보 및 설계조건 정합성 확인', severity: 'MEDIUM', status: 'NEEDS_CONFIRMATION', description: `NVIDIA Vision이 확인한 도면 정보(${visible || '가시 정보 제한'})를 기준으로 도면번호·축척·설계조건 및 관련 도면과의 일치 여부를 확인해야 합니다.`, evidence: visible || '도면상 확인 가능한 근거 부족', legalBasis: basis, recommendation: '최신 revision, 계산서 및 타 분야 도면과 대조하십시오.' }];
  }
  if (!Array.isArray(review.safetyItems) || review.safetyItems.length === 0) {
    review.safetyItems = [{ title: '시공·운영 안전 확인', severity: 'MEDIUM', status: 'NEEDS_CONFIRMATION', description: '도면에 표현된 설비·동선·장애물 관계와 현장 시공 조건을 확인해야 합니다.', evidence: visible || '현장 확인 필요', lawRegulation: basis, recommendation: '착공 전 현장 실측 및 간섭·접근성 검토를 수행하십시오.' }];
  }
  if (!Array.isArray(review.veItems) || review.veItems.length === 0) {
    review.veItems = [{ title: '원가 및 시공성 개선 검토', severity: 'INFO', status: 'NEEDS_CONFIRMATION', description: '기존 설비 재사용, 자재 수량 및 시공 순서를 도면·내역서·시방서와 대조하여 절감 가능성을 산정해야 합니다.', evidence: visible || '내역 근거 확인 필요', recommendation: '단가·물량·재료비·노무비·경비를 분리하여 대안을 비교하십시오.' }];
  }
  return review;
}

  // API Endpoint: Health & Backend Status Check
  app.get("/api/backend-status", (req, res) => {
    res.json({
      status: "ok",
      connected: true,
      backendDatabase: "Supabase PostgreSQL (Pre-Integrated on Backend)",
      deploymentServer: "Cloud Run / Vercel Serverless Ready",
      aiEngines: {
        gemini: { model: getGeminiModel(), configured: Boolean(getGeminiClient()) },
        nvidia: { vision: nvidiaModels.vision, embedding: nvidiaModels.embedding, text: nvidiaModels.text, configured: Boolean(process.env.NVIDIA_API_KEY) },
      },
      nvidiaRag: { vectorDb: vectorDbEnabled() ? 'supabase-pgvector' : 'not-configured', collection: vectorDbConfig.collection, strictMode: true },
      timestamp: new Date().toISOString(),
    });
  });

  // API Endpoint: Perform OCR and AI Engineering Review by Trade & Document Category
  app.post("/api/gemini/review-drawing", async (req, res) => {
    const requestProvider = req.body?.provider || 'gemini';
    try {
      const { fileName, mimeType, base64Data, pageNumber = 1, totalPages = 1, docCategory = "도면", tradeCategory = "소방", provider = 'gemini', model } = req.body;

      if (!fileName) {
        return res.status(400).json({ error: "File name is required" });
      }

      const ai = provider === 'nvidia' ? null : getGeminiClient();
      let ocrResult = null;
      let lastAiError = '';
      writeAiDiagnostic('START', { provider, model, fileName, pageNumber, totalPages, mimeType, hasBase64: Boolean(base64Data), base64Length: typeof base64Data === 'string' ? base64Data.length : 0 });

      if ((ai || provider === 'nvidia') && base64Data) {
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

          // RAG retrieval: use trade, document type and filename before vision analysis.
          // OCR text is added to this context after the model returns and is screened again.
          const retrievedRules = retrieveRules({ trade: tradeCategory, docCategory, fileName });
          const initialCode = /가스|누설/i.test(`${fileName} ${docCategory}`) ? 'NFPC 206' : /스프링클러|소화/i.test(`${fileName} ${docCategory}`) ? 'NFPC 103' : undefined;
          const retrievedClauses = [...fullFireRulesDb.clauses, ...fullTradeRulesDb.clauses].filter((clause: any) => clause.code === initialCode || `${clause.code} ${clause.clause}`.includes(initialCode)).slice(0, 12);
          const rulesContext = [
            ...retrievedRules.map((rule) => ({ id: rule.id, code: rule.code, title: rule.title, severity: rule.severity, source: rule.source })),
            ...retrievedClauses.map((clause: any) => ({ id: `${clause.code}-${clause.clause}`, code: clause.code, title: clause.clause, text: clause.text, source: { title: clause.code, url: clause.sourceUrl, publisher: clause.publisher } })),
          ].slice(0, 20);

          const fireReviewChecklist = tradeCategory === "소방" ? `
FIRE PROTECTION REVIEW CHECKLIST (mandatory):
1. Submission completeness: project name/address/site-building-floor identifiers; construction type; permit/application date and applicable code date; revision consistency across all disciplines; required explanations, calculations, schematics, plans, details, equipment schedules, specifications and BOQ; designer qualification/seal; performance-based-design/approval status; and special hazards including hazardous materials, gas, generator, ESS, kitchen, PV and EV charging.
2. Legal applicability: building use and specific fire-protection-object classification; mixed-use areas/occupants; gross area, floors, basements, windowless floors, roof, evacuation floor and parking consistency; building separation/shared fire-control room/water-source assumptions; required systems by use/area/floors; accessibility provisions; existing-building exceptions; and fire-consent submission scope including Fire Facilities Act Enforcement Rule Article 3.
3. Architectural coordination: fire compartments, fire doors/shutters/dampers, egress stairs/refuges/smoke-control zones, fire-truck access and fire department connections, fire-control room control scope, ceiling/beam/duct/light/louver obstructions, penetration firestopping, and tenant-fit-out relocation principles.
4. Water systems: demand water quantity, simultaneous use, flow/pressure/runtime, storage duplication/omission, pump head including friction/elevation/terminal pressure/fittings, pump start/stop logic, pump-room access/drainage/freezing/flood protection/emergency power, pipe sizing/velocity/support/seismic scope, zoning/PRV/test-drain/end-test provisions; hydrant hose/nozzle reach and cabinet conflicts; sprinkler hazard classification, head type/spacing/area, obstructions, concealed/void/canopy/ramp/mechanical/electrical/parking omissions, alarm/check valves and test access, and high-rack/high-ceiling/cold-storage/large-space design.
5. Special suppression and life safety: agent selection for generator/transformer/UPS/server/kitchen/hazardous areas; gas enclosure volume/openings/leak compensation/discharge time/pressure relief/asphyxiation warning and release interlocks; fire alarm receiver capacity/spare circuits, detector suitability, manual stations/sounders, zone/address consistency, automatic notification, emergency broadcasting, exit/corridor/accessibility lighting visibility, emergency power duration/transfer and accessible-user visual/audible alarms.
6. Smoke control/fire-fighting water: smoke-control targets/method against egress plans, airflow/pressure/dampers/fans/ducts/intake-exhaust separation, interlocks with HVAC/elevators/shutters/broadcasting, standpipe inlets/outlets/pressure/firefighter access, hydrant/emergency equipment/tank applicability and access.
7. Electrical/mechanical cause-and-effect: emergency power, generator capacity including starting current and simultaneous fire loads, and a complete cause-and-effect matrix for receiver, pumps, smoke fans, dampers, HVAC, elevators, electrical shutdown, shutters and emergency broadcasting. Check automatic/manual/local-priority controls and HVAC/smoke-control conflicts.
8. Constructability/maintenance: inspection/replacement clearances, equipment delivery paths, valve/flow/zone labels, freeze/condensation/corrosion/flood/vibration/noise/impact protection, access panels and post-completion testing/repair feasibility.
Immediate reject/supplement flags: architecture/fire mismatch in floor/area/use/compartments; missing code date or system schedule; missing/inconsistent water/pump/sprinkler calculations; missing smoke-control airflow/pressure/damper/interlock data; head/detector/exit-light clashes; unresolved egress/fire-control-room/fire-truck coordination; missing emergency power/cause-and-effect matrix; unclear firestopping/damper responsibility; or unsupported special-hazard agent selection.
For every checklist item return PASS, FAIL, or NEEDS_CONFIRMATION. Cite visible/document evidence. Never mark PASS merely because an item is not visible; use NEEDS_CONFIRMATION.
` : '';

          const promptText = `
You are a Lead Senior Engineering Reviewer & Professional Engineer (수석 엔지니어 / 기술사) specialized in **${tradeCategory}** engineering and **${docCategory}** review for POSCO Industrial & Plant Facilities.
Analyze this uploaded document file ("${fileName}").

This is page ${pageNumber} of ${totalPages}. Preserve this page number in every finding. Check title block, project identifiers, floor/area/use, revision and drawing number against visible content. If a cross-page comparison cannot be proven from this page, mark it NEEDS_CONFIRMATION rather than assuming consistency.

${fireReviewChecklist}

Document Category: ${docCategory} (도면 / 시방서 / 내역서)
Selected Trade / Specialty: ${tradeCategory} (토목 / 건축 / 건축기계 / 건축전기 / 소방)

RETRIEVED RULE CONTEXT (RAG): The following rules were retrieved from the engineering rules database. Use only matching rules as legal/technical evidence, and return the exact code in legalBasis/codeClause. If the drawing does not contain enough evidence, use NEEDS_CONFIRMATION.
${JSON.stringify(rulesContext)}

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

The review must be based on the visual content of the supplied PDF/image, not OCR alone. Inspect geometry, symbols, dimensions, linework, equipment, annotations, spatial relationships, clashes, missing components, and code-relevant visual evidence. Return coordinates for findings when visible.

WEB-BASED REVIEW: When a legal, code, standard, product requirement, or current approval procedure is cited, use Google Search grounding to verify the current official source. Prefer official Korean government, National Fire Agency, law.go.kr, KFI, KATS, KEC/KDS/NFPC/NFTC publisher or project-owner sources. Return the source title, URL, publisher and access date in webSources. Do not use a web source to override visible drawing evidence; use it only to validate the applicable rule. If no authoritative source is found, mark the item NEEDS_CONFIRMATION.

REVIEW OPINION FORMAT (mandatory): Do not limit the response to design errors. Write a rich professional design-review opinion in Korean, even when no definite defect is proven. The response must contain these sections:
1. 도면 기본 개요: project name, drawing title, drawing number, scale, page, discipline, and visible change scope. Do not invent values; label unreadable values as 확인 필요.
2. 주요 설계 검토 항목 및 체크리스트: create numbered review items appropriate to the visible drawing. For each item include 검토 기준, 도면에서 확인한 내용, 상태(PASS/FAIL/NEEDS_CONFIRMATION), evidence, applicable law/standard, and recommendation. Include confirmed compliant items and improvement recommendations, not only failures.
3. 현장 시공 및 추가 확인 필요사항: identify constructability, access/maintenance, coordination, obstruction, penetration, commissioning, tie-in, and field-verification risks visible or reasonably implied by the drawing. Clearly label assumptions.
4. 종합 검토의견: summarize overall suitability, unresolved risks, required supplement documents, and priority actions.
5. 시공 전 확인사항: list at least 5 actionable checks before mobilization, including latest-revision approval, site survey/as-built verification, existing utility tie-in, access/lifting/temporary works, material/submittal approval, coordinated openings and clash resolution, and permit/inspection prerequisites.
6. 시공 중·후 확인사항: list at least 5 checks covering installation quality, concealed-work inspection, pressure/flow/leak tests, alarm/interlock commissioning, labeling and accessibility, firestopping restoration, functional performance testing, as-built updates, training, and handover documents.
7. 타분야 연계 및 공급·역무범위: list at least 5 interface checks across architecture, structure, HVAC, electrical, civil, interior, controls/BMS and specialist vendors. Explicitly identify who supplies, installs, powers, controls, tests, approves and hands over each interface item. Flag exclusions, duplicated scope, owner-furnished equipment, vendor engineering, and responsibility gaps.
For fire protection drawings, explicitly write the following when the relevant information is visible: sprinkler discharge radius and head spacing against NFPC/NFTC 103; upright/pendent/sidewall or concealed-head selection and ceiling condition; branch/cross/main pipe diameter versus head-count sizing table; hydrant/extinguisher placement against NFPC 101; beam, lighting, grid, truss, duct and ceiling obstruction; existing-pipe valve/alarm-valve tie-in; pump, water-storage, smoke-control, emergency-power and cause-and-effect dependencies. If a numerical standard or table value cannot be verified from the supplied page, say so and request the calculation/detail rather than inventing compliance.

PAGE REVIEW DEPTH (mandatory): This request analyzes only page ${pageNumber} of ${totalPages}. Do not invent a full-set conclusion from one page and do not pad the response with generic checklist items. First inspect the page systematically in five passes: title block/scope, dimensions and clearances, symbols/equipment, routing and clashes, and code/safety/constructability implications. Return 5 or more substantive items only when the page contains enough evidence; otherwise return fewer evidence-backed items plus explicit NEEDS_CONFIRMATION items naming the exact missing source. Every item must reference this page or clearly identify the unavailable cross-page evidence.

SET-LEVEL REVIEW HANDOFF (mandatory): Mark page-local findings with pageNumber and preserve their evidence. Use the structured narrative to distinguish confirmed observations from cross-page checks. Never repeat the same wording merely to satisfy a count; prioritize unique engineering topics, measurable evidence, responsible party, and a concrete next action.

CATEGORY COVERAGE (mandatory): Cover design engineering, safety/legal compliance, constructability/interface, and cost/VE whenever the supplied page contains relevant evidence. Include at least one independent safety/legal item and at least one VE opportunity when applicable. If the page cannot establish a finding, return NEEDS_CONFIRMATION with the exact missing drawing, calculation, schedule, quantity, contract scope, test record, or site information. Do not repeat generic items just to reach a numeric count; the later file-level synthesis will expand and reconcile the page findings.

Quality gate for this review:
- Do not produce generic, reusable, or architecture-only example comments. Every finding must reference an observable feature in this exact uploaded page, or explicitly state that the feature could not be verified.
- Review the complete page image systematically in five passes: title block/scope, dimensions and clearances, equipment and symbols, routing/layout clashes, and code/safety/constructability/VE implications.
- Produce at least 3 substantive findings when the drawing contains enough visible information: include independent findings across design correctness, safety/code compliance, constructability/coordination, or cost/VE. If no defect is proven, return verification findings with the checked feature and evidence instead of inventing a defect.
- For every markup, provide a precise page number, normalized xPercent/yPercent at the actual evidence location, the observed evidence, the engineering implication, the applicable code or calculation basis, severity, and a concrete corrective action. Never place all markers at a default center point.
- Separate confirmed issues from items requiring field/detail confirmation. Do not call a drawing compliant solely because text was unreadable.
- For VE, inspect material sizes, routing length, repetition, access/maintenance, standardization, prefabrication, quantity gaps, and alternative specifications. Only include a saving amount when a visible quantity/unit rate or a clearly stated assumption supports it; include the calculation basis.

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
  "visualFindings": [
    { "id": "vf1", "finding": "Visual finding from the drawing", "evidence": "What is visibly present or missing", "xPercent": 50, "yPercent": 50, "confidence": 85 }
  ],
  "ruleScreening": [
    { "ruleId": "fire-sprinkler-spacing", "code": "NFTC 103 / NFPC 103", "status": "FAIL" | "NEEDS_CONFIRMATION", "evidence": "Rule-based screening result", "recommendation": "Action" }
  ],
  "reviewSummary": {
    "status": "오류 의심" | "주의" | "정상" | "긴급 확인",
    "result": "One sentence expert summary of ${tradeCategory} ${docCategory} review findings",
    "description": "Detailed technical analysis citing relevant ${tradeCategory} code clauses and technical requirements"
  },
  "reviewNarrative": {
    "drawingOverview": "도면 기본 개요 with project, title, scale, page and visible change scope",
    "checklistReview": [
      { "number": 1, "category": "설계|시공 전|시공 후|타분야 연계|공급·역무범위", "topic": "검토 항목", "criteria": "검토 기준", "observation": "도면에서 확인한 내용", "status": "PASS" | "FAIL" | "NEEDS_CONFIRMATION", "evidence": "증거", "legalBasis": "법률·기술기준", "responsibleParty": "확인 주체", "scopeOwner": "공급·시공·시험 책임 주체", "recommendation": "권고사항" }
    ],
    "preConstructionChecks": ["시공 전 확인사항"],
    "postConstructionChecks": ["시공 후 시험·준공 확인사항"],
    "interfaceAndScopeChecks": ["타분야·공급·역무범위 확인사항"],
    "siteAndConstructionNotes": ["현장 시공 및 추가 확인 필요사항"],
    "overallOpinion": "종합 검토의견",
    "requiredDocuments": ["추가 확인이 필요한 계산서·상세도·연동표 등"]
  },
  "webSources": [
    { "title": "Official source title", "url": "https://...", "publisher": "Source publisher", "accessedAt": "ISO timestamp", "supports": "Which review item this source supports" }
  ],
  "designErrors": [
    {
      "id": "err-1",
      "errorCode": "ERR-${tradeCategory}-001",
      "dwgFile": "${fileName}",
      "description": "Detailed design error description citing relevant code clauses",
      "type": "Mechanical" | "Electrical" | "Structural" | "Civil" | "Architectural" | "Fire" | "Other",
      "severity": "CRITICAL" | "WARNING" | "INFO",
      "suggestedFix": "Concrete engineering fix proposal with specific numerical values"
      ,"findingStatus": "PASS" | "FAIL" | "NEEDS_CONFIRMATION",
      "evidence": "Observed evidence from the supplied drawing/document",
      "legalBasis": "Applicable law, code clause, technical standard, or 'Not verifiable from supplied document'",
      "confidence": 85,
      "requiredConfirmation": "Additional drawing/calculation/site information required, or empty string"
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
      "severity": "CRITICAL",
      "findingStatus": "PASS" | "FAIL" | "NEEDS_CONFIRMATION",
      "evidence": "Exact visible evidence at this coordinate",
      "legalBasis": "Applicable law or technical standard",
      "confidence": 85,
      "correctiveAction": "Concrete corrective action or confirmation request",
      "pageNumber": ${pageNumber}
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
      "details": "Detailed legal requirement explanation",
      "findingStatus": "PASS" | "FAIL" | "NEEDS_CONFIRMATION",
      "evidence": "Observed evidence or missing evidence",
      "confidence": 85,
      "requiredConfirmation": "Additional information required, or empty string"
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
      "status": "검토대기",
      "findingStatus": "PASS" | "FAIL" | "NEEDS_CONFIRMATION",
      "evidence": "Visible quantity/specification/routing basis",
      "calculationBasis": "금액 기준 산출근거: 재료비·노무비·경비별 수량, 단가, 금액, 계산식과 적용 조건",
      "costBreakdown": { "materialCost": 0, "laborCost": 0, "expenseCost": 0, "basis": "도면에서 확인 가능한 수량·규격·공정만 사용하고, 불명확한 금액은 확인 필요로 표시" },
      "detailItems": [{ "label": "자재", "category": "재료비", "quantity": "", "unitPrice": 0, "amount": 0, "formula": "수량 × 단가" }, { "label": "시공", "category": "노무비", "quantity": "", "unitPrice": 0, "amount": 0, "formula": "공수 × 노무단가" }, { "label": "장비·운반·경비", "category": "경비", "quantity": "", "unitPrice": 0, "amount": 0, "formula": "수량 × 단가 또는 견적 기준" }]
    }
      ]
      ,"calculationInputs": {
        "sprinklerFlowLpm": 0, "simultaneousSprinklers": 0, "hydrantFlowLpm": 0, "simultaneousHydrants": 0,
        "requiredRuntimeMin": 0, "availableTankL": 0, "staticHeadM": 0, "frictionLossM": 0,
        "fittingLossM": 0, "terminalPressureM": 0, "smokeAreaM2": 0, "smokeAirChangesPerHour": 0,
        "emergencyLoadsKw": 0, "generatorCapacityKw": 0
      }
}
`;

          const partsArr: any[] = [{ text: promptText }];
          if (isSupportedMedia) {
            partsArr.unshift({
              inlineData: {
                mimeType: isPdf ? "application/pdf" : effectiveMime,
                data: cleanBase64,
              },
            });
          }

          let response: any;
          if (provider === 'nvidia') {
            const nvidiaImageUrl = base64Data.startsWith('data:')
              ? base64Data
              : `data:${effectiveMime};base64,${cleanBase64}`;
            const visionPayload = {
              model: nvidiaModels.vision,
              messages: [
                // The Nano VL model enables reasoning with /think. Legal
                // interpretation and Korean report writing remain delegated
                // to RAG, rules and the text LLM.
                { role: "system", content: "You are a precision engineering drawing extraction model. Analyze the image carefully and return only observable, location-specific facts. Never fill missing values with generic prose. Use UNREADABLE for values that cannot be read. Do not repeat a sentence." },
                { role: "user", content: [
                  { type: "image_url", image_url: { url: nvidiaImageUrl } },
                  { type: "text", text: `Extract page ${pageNumber}/${totalPages} of ${fileName}. Inspect title block, drawing title/number/scale, Korean labels, symbols, dimensions, pipes, equipment, layout relationships, clashes and safety-relevant visual evidence. Do not describe the image generically and do not repeat observations. Use UNREADABLE for values that cannot be read. Return a JSON object with drawingTitle, drawingNumber, scale, rawOcrText, ocrBlocks, visualFindings and extractedMeasurements. Every visualFinding must include the observed feature, evidence, xPercent and yPercent. Never infer unseen values.` },
                ] },
              ],
              temperature: 0.6,
              top_p: 0.95,
              max_tokens: 8192,
            };
            let visionJson: any;
            try {
              visionJson = await nvidiaRequest("/chat/completions", visionPayload);
            } catch (primaryVisionError) {
              // Keep reviews available when a hosted NIM worker for the
              // primary VL model is temporarily cold/recycling.
              writeAiDiagnostic('nvidia-vision-primary-failed', { model: visionPayload.model, error: (primaryVisionError as Error)?.message });
              if (visionPayload.model === nvidiaVisionFallbackModel) throw primaryVisionError;
              visionJson = await nvidiaRequest("/chat/completions", { ...visionPayload, model: nvidiaVisionFallbackModel });
              writeAiDiagnostic('nvidia-vision-fallback-used', { model: nvidiaVisionFallbackModel });
            }
            const visionMessage = visionJson.choices?.[0]?.message || {};
            const visionText = String(visionMessage.content || visionMessage.reasoning_content || '').trim();
            // Some NVIDIA NIM vision endpoints ignore response_format and return
            // prose. Preserve that observed description rather than failing the
            // whole review before the structured text-LLM synthesis stage.
            const parsedVisionResult = localizeVisionUnknowns(parseJsonObjectOrNull(visionText));
            const usableVisionText = isGenericVisionResponse(visionText) ? '' : visionText;
            const visionResult = parsedVisionResult || {
              drawingTitle: '', drawingNumber: '', scale: '', rawOcrText: visionText,
              ocrBlocks: usableVisionText ? [{ id: 'vision-prose', text: usableVisionText, category: 'visual-observation', confidence: 70 }] : [],
              visualFindings: usableVisionText ? [{ finding: usableVisionText, evidence: 'NVIDIA Vision 직접 관찰', confidence: 70 }] : [],
              extractedMeasurements: {},
            };
            if (isGenericVisionResponse(visionText)) {
              visionResult.rawOcrText = '도면에서 검토 가능한 구체적 시각 근거를 확인하지 못함';
              visionResult.ocrBlocks = [];
              visionResult.visualFindings = [];
            }
            const visionOcrBlocks = Array.isArray(visionResult.ocrBlocks) ? visionResult.ocrBlocks : [];
            const visionFindings = Array.isArray(visionResult.visualFindings)
              ? visionResult.visualFindings
              : visionResult.visualFindings
                ? [{ finding: typeof visionResult.visualFindings === 'string' ? visionResult.visualFindings : JSON.stringify(visionResult.visualFindings), evidence: '' }]
                : [];
            const evidenceText = [visionResult.rawOcrText, ...visionOcrBlocks.map((block: any) => block.text), ...visionFindings.map((finding: any) => `${finding.finding || ''} ${finding.evidence || ''}`), JSON.stringify(visionResult.extractedMeasurements || {}), fileName].filter(Boolean).join("\n");
            const preliminaryScreening = runRuleScreening(retrievedRules, evidenceText);
            const candidateRules = [...retrievedRules, ...retrievedClauses];
            // Retrieve against the actual page evidence even when text synthesis
            // is deferred. Previously multi-page NVIDIA reviews skipped pgvector
            // here and passed only keyword candidates to the final pass.
            const rankedRules = vectorDbEnabled()
              ? await retrieveFromVectorDb(`${tradeCategory} ${docCategory}\n${evidenceText}`, { trade: tradeCategory }, candidateRules, 8)
              : candidateRules.slice(0, 12);
            const nvidiaRagContext = rankedRules.map((rule: any) => ({ id: rule.id, code: rule.code, title: rule.title || rule.clause, text: rule.text, severity: rule.severity, source: rule.source || { title: rule.code, url: rule.sourceUrl, publisher: rule.publisher }, retrievalScore: rule.retrievalScore }));
            if (req.body.skipPageSynthesis === true) {
              // For multi-page NVIDIA reviews, defer the expensive text synthesis
              // until all pages have completed. Keep page-local evidence and RAG
              // context so the file-level synthesizer can still cite page numbers.
              response = { text: JSON.stringify({
                drawingTitle: visionResult.drawingTitle,
                drawingNumber: visionResult.drawingNumber,
                scale: visionResult.scale,
                rawOcrText: visionResult.rawOcrText,
                ocrBlocks: visionOcrBlocks,
                visualFindings: visionFindings,
                extractedMeasurements: visionResult.extractedMeasurements || {},
                ruleScreening: buildRuleEvidence(preliminaryScreening),
                ragContext: nvidiaRagContext,
                engine: { provider: 'nvidia', stages: ['multimodal-vision', 'embedding-rerank', 'rule-screening'], visionModel: nvidiaModels.vision, embeddingModel: nvidiaEmbeddingModel(), textModel: nvidiaTextModel() },
              }) };
            } else {
              response = { text: await synthesizeNvidiaReview(`${promptText}\n\nNVIDIA VISION EVIDENCE:\n${JSON.stringify(visionResult)}\n\nRULE-BASED PRE-SCREENING:\n${JSON.stringify(buildRuleEvidence(preliminaryScreening))}\n\nVECTOR DB TOP-K RAG CONTEXT:\n${JSON.stringify(nvidiaRagContext)}\n\nUse only visible evidence, write concise substantive Korean findings, preserve the exact JSON schema, and mark unseen items NEEDS_CONFIRMATION.`) };
            }
          } else {
            // Vertex AI does not allow controlled JSON generation together
            // with the Google Search tool. Keep the strict JSON contract for
            // drawing review and use the injected rules/RAG context as sources.
            response = await ai!.models.generateContent({ model: model || getGeminiModel(), contents: { role: "user", parts: partsArr }, config: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 20000 } });
          }

          const modelText = extractModelText(response);
          if (modelText) {
            const normalizedText = modelText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            ocrResult = normalizeReviewKeys(JSON.parse(normalizedText));
            if (provider === 'nvidia' && req.body.skipPageSynthesis !== true) {
              ocrResult = ensureNvidiaReviewItems(ocrResult, [ocrResult.rawOcrText, ...(ocrResult.ocrBlocks || []).map((block: any) => block.text), ...(ocrResult.visualFindings || []).map((finding: any) => typeof finding === 'string' ? finding : finding.finding || '')].filter(Boolean).join(' '), retrievedRules);
            }
            const ruleText = [ocrResult.rawOcrText, ...(ocrResult.ocrBlocks || []).map((block: any) => block.text), fileName].filter(Boolean).join("\n");
            ocrResult.ruleScreening = runRuleScreening(retrievedRules, ruleText);
            ocrResult.engine = provider === 'nvidia' ? { provider: 'nvidia', stages: req.body.skipPageSynthesis === true ? ['multimodal-vision', 'embedding-rerank', 'rule-screening'] : ['multimodal-vision', 'embedding-rerank', 'rule-screening', 'text-llm-synthesis'], visionModel: nvidiaVisionModel(model), embeddingModel: nvidiaEmbeddingModel(), textModel: nvidiaTextModel() } : { provider: 'gemini', model: model || getGeminiModel() };
            const clauseKeywords = ['가스', '스프링클러', '소화기', '감지기', '피난', '제연', '수신기', '방화'];
            const matchedClauses = fullFireRulesDb.clauses.filter((clause: any) => clauseKeywords.some((keyword) => ruleText.includes(keyword) && clause.text.includes(keyword))).slice(0, 30);
            ocrResult.ruleScreening.push(...matchedClauses.map((clause: any) => ({ ruleId: `${clause.code}-${clause.clause}`, code: clause.code, title: clause.clause, severity: 'INFO', matched: true, status: 'NEEDS_CONFIRMATION', evidence: clause.text, recommendation: '도면의 해당 항목과 조문 적용 여부를 담당 기술자가 확인하십시오.', source: { title: clause.code, url: clause.sourceUrl, publisher: clause.publisher } })));
            const screenedFailures = ocrResult.ruleScreening.filter((item) => item.matched || item.status === "FAIL");
            ocrResult.designErrors = (ocrResult.designErrors || []).map((item: any) => ({
              ...item,
              legalBasis: item.legalBasis || item.codeClause || screenedFailures.find((rule) => rule.severity === "CRITICAL")?.code || "확인 필요",
              ruleScreening: screenedFailures,
            }));
            ocrResult.safetyItems = (ocrResult.safetyItems || []).map((item: any) => ({
              ...item,
              lawRegulation: item.lawRegulation || screenedFailures.find((rule) => rule.severity !== "INFO")?.code || "확인 필요",
              ruleScreening: screenedFailures,
            }));
            ocrResult.veItems = (ocrResult.veItems || []).map((item: any) => ({
              ...item,
              legalBasis: item.legalBasis || item.codeClause || "계약·내역·시방서 대조 필요",
              ruleScreening: screenedFailures,
            }));
          }
        } catch (aiErr) {
          lastAiError = (aiErr as Error)?.message || String(aiErr);
          writeAiDiagnostic('AI_ERROR', { provider, model, message: lastAiError, stack: (aiErr as Error)?.stack });
          console.warn("Gemini Vision API notice (switching seamlessly to domain engineering engine):", (aiErr as Error)?.message || aiErr);
        }
      }

      if (!ocrResult) {
        writeAiDiagnostic('NO_RESULT', { provider, model, detail: lastAiError || 'empty model response' });
        return res.status(502).json({
          success: false,
          error: "AI drawing review did not return a valid visual analysis. No mock result was generated.",
          provider,
          detail: lastAiError || 'AI provider returned no parseable content',
        });
      }

      // No synthetic fallback: every accepted result must come from the uploaded document.
      /*
      // Dynamic File-Specific Analysis Engine (legacy prototype fallback)
      if (!ocrResult) {
        const fileExt = fileName.split(".").pop()?.toUpperCase() || "DWG";
        const cleanName = fileName.replace(/\.[^/.]+$/, "");

        // Compute string hash to guarantee distinct, deterministic attributes for identical filenames while ensuring variation between different files
        let hash = 0;
        const seedStr = `${fileName}_${docCategory}_${tradeCategory}`;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash << 5) - hash + seedStr.charCodeAt(i);
          hash |= 0;
        }
        const absHash = Math.abs(hash);

        const tradePrefixMap: Record<string, string> = {
          토목: "CIVIL",
          건축: "ARCH",
          건축기계: "MECH",
          건축전기: "ELEC",
          소방: "FIRE",
        };
        const prefix = tradePrefixMap[tradeCategory] || "ENG";

        const dwgNo = `DWG-${prefix}-${(absHash % 899) + 100}`;
        const scales = ["1 : 50", "1 : 100", "1 : 150", "1 : 200", "N/S"];
        const chosenScale = scales[absHash % scales.length];

        // Coordinate calculations for visual pin variation
        const x1 = 18 + (absHash % 45);
        const y1 = 20 + ((absHash * 3) % 40);
        const x2 = 55 + ((absHash * 7) % 35);
        const y2 = 45 + ((absHash * 11) % 40);

        // Detect keywords from file name for specialized text tailored to the specific file
        const lowerName = fileName.toLowerCase();
        let subTag = "일반";
        if (lowerName.includes("1f") || lowerName.includes("1층")) subTag = "1F 지상층";
        else if (lowerName.includes("2f") || lowerName.includes("2층")) subTag = "2F 지상층";
        else if (lowerName.includes("b1") || lowerName.includes("지하")) subTag = "B1 지하층";
        else if (lowerName.includes("옥상") || lowerName.includes("roof")) subTag = "RF 옥상층";
        else if (lowerName.includes("계통") || lowerName.includes("riser")) subTag = "입상 계통도";
        else if (lowerName.includes("단면") || lowerName.includes("section")) subTag = "종횡 단면도";
        else if (lowerName.includes("시방")) subTag = "기술 시방서";
        else if (lowerName.includes("내역") || lowerName.includes("boq")) subTag = "수량 산출 내역서";

        const drawingTitle = `${cleanName} [${tradeCategory} ${docCategory} - ${subTag}]`;

        if (tradeCategory === "토목") {
          const depth = (8 + (absHash % 8) + 0.5).toFixed(1);
          const slope = (absHash % 2 === 0 ? "1:1.2" : "1:1.5");
          const pipeSize = absHash % 2 === 0 ? "D600" : "D800";
          
          ocrResult = {
            drawingTitle,
            drawingNumber: dwgNo,
            scale: chosenScale,
            docCategory,
            tradeCategory,
            rawOcrText: `[토목공사 정밀 검토 - ${fileName}]\n도서명: ${drawingTitle}\n도서구분: ${docCategory}\n공종: 토목 (Civil Engineering)\n주요 검토 항목: 굴착 깊이 H=${depth}m, 흙막이 가설구조물(H-Pile + Raker), 사면 기울기(${slope}), 토공사 절토/성토 수량산정, 우수 배수관로(${pipeSize}).\n적용 법규: KDS 11 00 00 (토공사 및 토질기초) / KDS 21 30 00 (가설구조물 설계기준).`,
            ocrBlocks: [
              { id: "b1", text: `도서명: ${drawingTitle}`, category: "표제란", confidence: 99 },
              { id: "b2", text: `공종: 토목 / 도면번호: ${dwgNo} / 축척: ${chosenScale}`, category: "표제란", confidence: 98 },
              { id: "b3", text: `Grid X1-Y4 구역 흙막이 굴착 깊이 H=${depth}m (H-Pile 300x300 @1.5m)`, category: "치수", confidence: 96 },
              { id: "b4", text: `지하수위 GL-3.5m 및 LW 차수 그라우팅 2열 시공 지정`, category: "소방/안전", confidence: 95 },
              { id: "b5", text: `우수 배수관로 ${pipeSize} PE관 연결 구배 (1/220) 지적`, category: "특기사항", confidence: 93 },
            ],
            reviewSummary: {
              status: "오류 의심",
              result: `[토목/${docCategory}] "${fileName}" - KDS 토질기초/가설구조물 검토 완료 (지적 ${dwgNo})`,
              description: `"${fileName}" 토목 정밀 검토 결과: Grid X1-Y4 구역의 H-Pile 토압 계산 검토 결과 허용 변위(30mm) 초과 위험이 감지되었으며, ${pipeSize} 배수관 구배(1/220)가 KDS 44 50 00 기준(1/150 이상)에 미달함.`
            },
            designErrors: [
              {
                id: `err-civil-${absHash % 1000}`,
                errorCode: `ERR-CIVIL-${(absHash % 89) + 10}`,
                dwgFile: fileName,
                description: `[KDS 11 10 10 / KDS 21 30 00 위반] "${fileName}" 굴착 깊이 H=${depth}m 구간 흙막이 H-Pile 가설 앵커 긴장력(220kN) 부족 및 사면 토압 수치 미검증.`,
                type: "Civil",
                severity: "CRITICAL",
                suggestedFix: `가설 앵커 2단 추가 신설 및 토사 유실 방지 LW 차수 그라우팅 3열 보강 설계 반영 (도면 ${dwgNo} 수정요구).`
              }
            ],
            markups: [
              {
                id: `m1-${absHash % 1000}`,
                xPercent: x1,
                yPercent: y1,
                title: `📌 [토목 검토 1] "${fileName}" - 흙막이 버팀대 변위 초과`,
                comment: `KDS 21 30 00 기준 H-Pile @1.5m 수평 변위 토압 검토 필요 (예상 변위 38mm > 허용 30mm).`,
                codeClause: "KDS 21 30 00 (가설구조물)",
                severity: "CRITICAL"
              },
              {
                id: `m2-${absHash % 1000}`,
                xPercent: x2,
                yPercent: y2,
                title: `📌 [토목 검토 2] "${fileName}" - ${pipeSize} 관로 경사 부족`,
                comment: `${pipeSize} PE 우수관 구배가 1/220으로 설계되어 통수 능력 부족 우려 (최소 1/150 필요).`,
                codeClause: "KDS 44 50 00 (도로배수)",
                severity: "WARNING"
              }
            ],
            safetyItems: [
              {
                id: `saf-civil-${absHash % 1000}`,
                fileName: fileName,
                fileType: fileExt,
                reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                summary: `"${fileName}" 지하안전관리에 관한 특별법 계측기 수량 검토`,
                lawRegulation: "지하안전관리에 관한 특별법 제18조",
                severity: "주의",
                status: "즉시 조치 필요",
                details: `굴착 영향권 내 지중경사계(Inclinometer) 2개소 및 지하수위계 1개소 표기 누락. 계측기 수량 보정 필수.`
              }
            ],
            veItems: [
              {
                id: `ve-civil-${absHash % 1000}`,
                type: "VE 제안",
                docCategory,
                tradeCategory,
                description: `"${fileName}" 토공사 절토 토사 유용 및 사토 운반거리 단축`,
                subDescription: `현장 내 성토용 토사 ${(absHash % 5 + 4) * 1000}m³ 재활용으로 공사비 절감`,
                location: `${subTag} 토공 구역`,
                impactKw: (45 + (absHash % 40)) * 1000000,
                status: "검토대기"
              }
            ]
          };
        } else if (tradeCategory === "건축") {
          const travelDist = (35 + (absHash % 12) + 0.5).toFixed(1);
          const slabThk = 210 + (absHash % 3) * 30;
          
          ocrResult = {
            drawingTitle,
            drawingNumber: dwgNo,
            scale: chosenScale,
            docCategory,
            tradeCategory,
            rawOcrText: `[건축공사 정밀 검토 - ${fileName}]\n도서명: ${drawingTitle}\n도서구분: ${docCategory}\n공종: 건축 (Architectural Engineering)\n주요 검토 항목: 피난계단 동선 보행거리(L=${travelDist}m), 방화구획 벽체 및 내화문(F60), 구조 슬래브 두께(t=${slabThk}mm), 외벽 단열재 준불연 스펙.\n적용 법규: 건축법 시행령 제34조 (직통계단) / 제46조 (방화구획) / KDS 14 20 00 (콘크리트구조).`,
            ocrBlocks: [
              { id: "b1", text: `도서명: ${drawingTitle}`, category: "표제란", confidence: 99 },
              { id: "b2", text: `공종: 건축 / 도면번호: ${dwgNo} / 축척: ${chosenScale}`, category: "표제란", confidence: 98 },
              { id: "b3", text: `피난동선 검토: 거실 말단~직통계단 보행거리 L=${travelDist}m (법정 30m 초과)`, category: "치수", confidence: 96 },
              { id: "b4", text: `방화구획 벽체 60분+ 방화문 수량 누락 구역 확인`, category: "소방/안전", confidence: 95 },
              { id: "b5", text: `구조 슬래브 두께 t=${slabThk}mm 및 철근 배근 상세 수량 반영`, category: "재질", confidence: 93 },
            ],
            reviewSummary: {
              status: "오류 의심",
              result: `[건축/${docCategory}] "${fileName}" - 건축법 피난방화 및 KDS 구조기준 검토 완료 (${dwgNo})`,
              description: `"${fileName}" 건축 정밀 검토 결과: 직통계단까지의 보행거리가 ${travelDist}m로 건축법 법정 제한(30m 이내)을 초과하였고, 방화구획 도면 표기 불일치가 확인됨.`
            },
            designErrors: [
              {
                id: `err-arch-${absHash % 1000}`,
                errorCode: `ERR-ARCH-${(absHash % 89) + 10}`,
                dwgFile: fileName,
                description: `[건축법 시행령 제34조 위반] "${fileName}" 피난동선 보행거리 L=${travelDist}m 발생 (법정 기준 30m 이하 준수 필수).`,
                type: "Architectural",
                severity: "CRITICAL",
                suggestedFix: `피난계단 1개소 신설 또는 코어 개구부 위치 조정을 통해 보행거리 ${travelDist}m -> 28m 이내 단축 반영.`
              }
            ],
            markups: [
              {
                id: `m1-${absHash % 1000}`,
                xPercent: x1,
                yPercent: y1,
                title: `📌 [건축 검토 1] "${fileName}" - 피난 보행거리 법정초과 (L=${travelDist}m)`,
                comment: `건축법 시행령 제34조에 따라 거실 각 부분으로부터 직통계단 보행거리 30m 이내 준수 필요.`,
                codeClause: "건축법 시행령 제34조",
                severity: "CRITICAL"
              },
              {
                id: `m2-${absHash % 1000}`,
                xPercent: x2,
                yPercent: y2,
                title: `📌 [건축 검토 2] "${fileName}" - 방화구획 방화문 미표기`,
                comment: `1,000m² 구획 벽체 구간 내화성능 2시간 준수 및 60분+ 방화문 표기 누락.`,
                codeClause: "건축법 시행령 제46조",
                severity: "WARNING"
              }
            ],
            safetyItems: [
              {
                id: `saf-arch-${absHash % 1000}`,
                fileName: fileName,
                fileType: fileExt,
                reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                summary: `"${fileName}" 건축물 피난·방화구조 규칙 준수 여부 검토`,
                lawRegulation: "건축물의 피난·방화구조 등의 기준에 관한 규칙 제14조",
                severity: "주의",
                status: "즉시 조치 필요",
                details: `외벽 마감재 준불연 시험성적서 및 층간 화재확산 방지재 상세도 표제란 누락. 상세 표기 보정 요구.`
              }
            ],
            veItems: [
              {
                id: `ve-arch-${absHash % 1000}`,
                type: "VE 제안",
                docCategory,
                tradeCategory,
                description: `"${fileName}" 천장틀 및 칸막이 벽체 자재 모듈화`,
                subDescription: `경량철골 모듈화 시공으로 천장 마감 손실율(Loss) 7% 절감 및 공기 단축`,
                location: `${subTag} 내부 구역`,
                impactKw: (30 + (absHash % 35)) * 1000000,
                status: "검토대기"
              }
            ]
          };
        } else if (tradeCategory === "건축기계") {
          const ductVelocity = (7.5 + (absHash % 3) * 0.5 + 0.2).toFixed(1);
          const ductSize = absHash % 2 === 0 ? "450x300" : "500x350";
          const pipeDim = absHash % 2 === 0 ? "80A" : "100A";

          ocrResult = {
            drawingTitle,
            drawingNumber: dwgNo,
            scale: chosenScale,
            docCategory,
            tradeCategory,
            rawOcrText: `[건축기계 정밀 검토 - ${fileName}]\n도서명: ${drawingTitle}\n도서구분: ${docCategory}\n공종: 건축기계 (HVAC / Plumbing Engineering)\n주요 검토 항목: 공조 급기 덕트 규격(${ductSize}), 풍속(${ductVelocity}m/s), 배관 관통 방화댐퍼(FD), 급수/급탕 배관(${pipeDim}), 위생기구 관로 마찰손실.\n적용 법규: KDS 31 25 10 (공기조화설비) / 기계설비기술기준 / KDS 31 20 00.`,
            ocrBlocks: [
              { id: "b1", text: `도서명: ${drawingTitle}`, category: "표제란", confidence: 99 },
              { id: "b2", text: `공종: 건축기계 / 도면번호: ${dwgNo} / 축척: ${chosenScale}`, category: "표제란", confidence: 98 },
              { id: "b3", text: `공조 SA 덕트 ${ductSize} (풍속 ${ductVelocity}m/s로 권장기준 6.0m/s 초과)`, category: "치수", confidence: 96 },
              { id: "b4", text: `방화구획 관통부 퓨즈형 방화 댐퍼(FD) 표기 누락`, category: "소방/안전", confidence: 95 },
              { id: "b5", text: `급탕 배관 ${pipeDim} 보온재 두께 (40mm -> 50mm) 보정 요구`, category: "재질", confidence: 93 },
            ],
            reviewSummary: {
              status: "오류 의심",
              result: `[건축기계/${docCategory}] "${fileName}" - KDS 기계설비기준 검토 완료 (덕트/배관 지적 ${dwgNo})`,
              description: `"${fileName}" 기계설비 정밀 검토 결과: 급기 덕트 ${ductSize} 구간 내 풍속이 ${ductVelocity}m/s로 과다하여 소음 및 정압 손실이 예상되며, 방화구획 관통 FD 설치 표기가 누락됨.`
            },
            designErrors: [
              {
                id: `err-mech-${absHash % 1000}`,
                errorCode: `ERR-MECH-${(absHash % 89) + 10}`,
                dwgFile: fileName,
                description: `[KDS 31 25 10 위반] "${fileName}" 공조 급기 덕트 풍속 ${ductVelocity}m/s 발생 (사무실/실내 기준 6.0m/s 이하 준수 필수).`,
                type: "Mechanical",
                severity: "CRITICAL",
                suggestedFix: `덕트 사이즈를 ${ductSize}에서 단면적 20% 확대하고 소음기(Attenuator) 배치 반영.`
              }
            ],
            markups: [
              {
                id: `m1-${absHash % 1000}`,
                xPercent: x1,
                yPercent: y1,
                title: `📌 [기계 검토 1] "${fileName}" - 급기 덕트 풍속 과다 (${ductVelocity}m/s)`,
                comment: `풍속 ${ductVelocity}m/s 소음 유발 우려. 덕트 단면적 확대 및 소음 챔버 설치 권고.`,
                codeClause: "KDS 31 25 10 (공조설비)",
                severity: "CRITICAL"
              },
              {
                id: `m2-${absHash % 1000}`,
                xPercent: x2,
                yPercent: y2,
                title: `📌 [기계 검토 2] "${fileName}" - 방화댐퍼(FD) 표기 누락`,
                comment: `방화구획 벽체 및 슬래브 관통 덕트 위치에 자동 방화댐퍼(FD) 표시 필수.`,
                codeClause: "기계설비기술기준 제11조",
                severity: "WARNING"
              }
            ],
            safetyItems: [
              {
                id: `saf-mech-${absHash % 1000}`,
                fileName: fileName,
                fileType: fileExt,
                reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                summary: `"${fileName}" 기계설비법 및 급탕 위생 법규 검토`,
                lawRegulation: "기계설비법 제15조 및 KDS 31 20 00",
                severity: "주의",
                status: "즉시 조치 필요",
                details: `급탕 관로 ${pipeDim} 보온재 두께 40mm 지정은 에너지절약설계기준(50mm 이상) 미달. 보정 요구.`
              }
            ],
            veItems: [
              {
                id: `ve-mech-${absHash % 1000}`,
                type: "VE 제안",
                docCategory,
                tradeCategory,
                description: `"${fileName}" 주배관 그루브 조인트(Groove Joint) 무용접 공법 적용`,
                subDescription: `${pipeDim} 이상 주관로 용접 공정 대체로 현장 시공 공수 22% 절감`,
                location: `${subTag} 기계관로 구역`,
                impactKw: (38 + (absHash % 40)) * 1000000,
                status: "검토대기"
              }
            ]
          };
        } else if (tradeCategory === "건축전기") {
          const voltDrop = (3.4 + (absHash % 4) * 0.3).toFixed(1);
          const cableSq = absHash % 2 === 0 ? "150sq" : "185sq";
          const trCap = 1000 + (absHash % 5) * 250;

          ocrResult = {
            drawingTitle,
            drawingNumber: dwgNo,
            scale: chosenScale,
            docCategory,
            tradeCategory,
            rawOcrText: `[건축전기 정밀 검토 - ${fileName}]\n도서명: ${drawingTitle}\n도서구분: ${docCategory}\n공종: 건축전기 (Electrical Engineering)\n주요 검토 항목: 수변전 설비(TR ${trCap}kVA), 간선 케이블(TFR-CV ${cableSq}), 전압강하(${voltDrop}%), 서지보호장치(SPD), KEC 접지공사.\n적용 법규: KEC (한국전기설비규정 232.3.9) / KDS 31 60 00 (전기설비설계).`,
            ocrBlocks: [
              { id: "b1", text: `도서명: ${drawingTitle}`, category: "표제란", confidence: 99 },
              { id: "b2", text: `공종: 건축전기 / 도면번호: ${dwgNo} / 축척: ${chosenScale}`, category: "표제란", confidence: 98 },
              { id: "b3", text: `간선 케이블 TFR-CV ${cableSq} 전압강하 ${voltDrop}% (KEC 기준 3.0% 초과)`, category: "치수", confidence: 96 },
              { id: "b4", text: `변압기 TR ${trCap}kVA 2차측 KEC 서지보호장치(SPD) 수량 미반영`, category: "소방/안전", confidence: 95 },
              { id: "b5", text: `전선관 충전율 42% (허용치 40% 초과) 재조정 필요`, category: "특기사항", confidence: 93 },
            ],
            reviewSummary: {
              status: "오류 의심",
              result: `[건축전기/${docCategory}] "${fileName}" - KEC 한국전기설비규정 검토 완료 (${dwgNo})`,
              description: `"${fileName}" 전기 정밀 검토 결과: 수용가 말단 간선 전압강하가 ${voltDrop}%로 KEC 기준(3.0% 이내)을 초과하였으며, KEC 규정 SPD 서지보호기 설치가 누락됨.`
            },
            designErrors: [
              {
                id: `err-elec-${absHash % 1000}`,
                errorCode: `ERR-ELEC-${(absHash % 89) + 10}`,
                dwgFile: fileName,
                description: `[KEC 232.3.9 위반] "${fileName}" 간선거리 L=${110 + (absHash % 40)}m 구간 TFR-CV ${cableSq} 케이블 전압강하 ${voltDrop}% 발생 (KEC 허용치 3% 이내).`,
                type: "Electrical",
                severity: "CRITICAL",
                suggestedFix: `간선 케이블 규격을 TFR-CV ${cableSq} -> ${absHash % 2 === 0 ? "185sq" : "240sq"}로 1단계 증경 표기.`
              }
            ],
            markups: [
              {
                id: `m1-${absHash % 1000}`,
                xPercent: x1,
                yPercent: y1,
                title: `📌 [전기 검토 1] "${fileName}" - 간선 전압강하 초과 (${voltDrop}%)`,
                comment: `말단 전압강하 방지를 위해 케이블 규격 증경 필수 (KEC 232.3.9 준수).`,
                codeClause: "KEC 232.3.9 (전압강하)",
                severity: "CRITICAL"
              },
              {
                id: `m2-${absHash % 1000}`,
                xPercent: x2,
                yPercent: y2,
                title: `📌 [전기 검토 2] "${fileName}" - KEC SPD (서지보호기) 누락`,
                comment: `수전반 메인 버스바 구간에 Class II 서지보호장치(SPD) 수량 명기 필요.`,
                codeClause: "KEC 150 (서지보호)",
                severity: "WARNING"
              }
            ],
            safetyItems: [
              {
                id: `saf-elec-${absHash % 1000}`,
                fileName: fileName,
                fileType: fileExt,
                reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                summary: `"${fileName}" 전기안전관리법 및 KEC 누전차단기 감도 검토`,
                lawRegulation: "전기안전관리법 제12조 및 KEC 140",
                severity: "주의",
                status: "즉시 조치 필요",
                details: `습기 장소 회로 인체감전보호용 고감도 누전차단기(15mA 0.03초) 지정 명기.`
              }
            ],
            veItems: [
              {
                id: `ve-elec-${absHash % 1000}`,
                type: "VE 제안",
                docCategory,
                tradeCategory,
                description: `"${fileName}" 고효율 LED 센서 등기구 배치 최적화`,
                subDescription: `조도 DIALux 시뮬레이션 기반 등기구 수량 최적화로 등기구 자재비 16% 절감`,
                location: `${subTag} 전력 구역`,
                impactKw: (35 + (absHash % 30)) * 1000000,
                status: "검토대기"
              }
            ]
          };
        } else {
          // Default: 소방 (Fire Protection)
          const headCount = 4 + (absHash % 2);
          const pipeSize = absHash % 2 === 0 ? "32A" : "40A";
          const radius = (2.6 + (absHash % 3) * 0.2).toFixed(1);

          ocrResult = {
            drawingTitle,
            drawingNumber: dwgNo,
            scale: chosenScale,
            docCategory,
            tradeCategory,
            rawOcrText: `[소방공사 정밀 검토 - ${fileName}]\n도서명: ${drawingTitle}\n도서구분: ${docCategory}\n공종: 소방공사 (Fire Protection Engineering)\n주요 검토 항목: 스프링클러 가지배관(${pipeSize}), K-Factor 80 상향식 헤드(연결수 ${headCount}개), 살수반경(R=${radius}m), 알람밸브(AV-10${(absHash % 5) + 1}), 자탐 감지기.\n적용 법규: 화재안전기술기준 NFTC 103 (스프링클러) / NFTC 203 (자동화재탐지설비).`,
            ocrBlocks: [
              { id: "b1", text: `도서명: ${drawingTitle}`, category: "표제란", confidence: 99 },
              { id: "b2", text: `공종: 소방공사 / 도면번호: ${dwgNo} / 축척: ${chosenScale}`, category: "표제란", confidence: 98 },
              { id: "b3", text: `스프링클러 가지배관 ${pipeSize} 내 헤드 수량 ${headCount}개 배치 (NFTC 기준 초과)`, category: "치수", confidence: 96 },
              { id: "b4", text: `보(Beam) 하부 살수반경 R=${radius}m 사각지대 발생`, category: "소방/안전", confidence: 95 },
              { id: "b5", text: `알람밸브 AV-10${(absHash % 5) + 1} 드레인관 규격 보정 요구`, category: "재질", confidence: 93 },
            ],
            reviewSummary: {
              status: "오류 의심",
              result: `[소방/${docCategory}] "${fileName}" - 화재안전기술기준(NFTC) 검토 완료 (지적 ${dwgNo})`,
              description: `"${fileName}" 소방 정밀 검토 결과: NFTC 103에 따른 스프링클러 가지배관 ${pipeSize} 관로별 헤드 최대 허용수량(3개) 초과(${headCount}개 배치) 및 보 하부 살수 사각지대 발생.`
            },
            designErrors: [
              {
                id: `err-fire-${absHash % 1000}`,
                errorCode: `ERR-FIRE-${(absHash % 89) + 10}`,
                dwgFile: fileName,
                description: `[NFTC 103 제5조 위반] "${fileName}" 가지배관 ${pipeSize} 구경 구간에 헤드 ${headCount}개가 배치되어 법정 기준(최대 3개 이하) 위반.`,
                type: "Fire",
                severity: "CRITICAL",
                suggestedFix: `가지배관 관로를 ${pipeSize} -> ${pipeSize === "32A" ? "40A" : "50A"}로 확관하거나 분할 2원 배관 반영 (도면 ${dwgNo} 수정).`
              }
            ],
            markups: [
              {
                id: `m1-${absHash % 1000}`,
                xPercent: x1,
                yPercent: y1,
                title: `📌 [소방 검토 1] "${fileName}" - 가지배관 ${pipeSize} 헤드 ${headCount}개 과다`,
                comment: `NFTC 103 제5조 표 2.5.3 기준 ${pipeSize} 배관 최대 연결 헤드 수 3개 이하 준수 필수.`,
                codeClause: "NFTC 103 제5조 (스프링클러 배관)",
                severity: "CRITICAL"
              },
              {
                id: `m2-${absHash % 1000}`,
                xPercent: x2,
                yPercent: y2,
                title: `📌 [소방 검토 2] "${fileName}" - 살수반경 R=${radius}m 사각지대`,
                comment: `보(Beam) 하부 및 천장 모서리 헤드 미배치 구역 화재 살수 불가 지적.`,
                codeClause: "NFTC 103 제6조 (헤드 배치)",
                severity: "WARNING"
              }
            ],
            safetyItems: [
              {
                id: `saf-fire-${absHash % 1000}`,
                fileName: fileName,
                fileType: fileExt,
                reviewedAt: new Date().toISOString().replace("T", " ").substring(0, 16),
                summary: `"${fileName}" NFTC 203 자동화재탐지설비 감지기 배치 정밀 확인`,
                lawRegulation: "소방시설법 제12조 및 화재안전기술기준 NFTC 203",
                severity: "주의",
                status: "즉시 조치 필요",
                details: `보 하부 0.6m 이내 감지기 이격거리 미달 및 비상전원 수신반 신호선 연동 점검 필요.`
              }
            ],
            veItems: [
              {
                id: `ve-fire-${absHash % 1000}`,
                type: "VE 제안",
                docCategory,
                tradeCategory,
                description: `"${fileName}" 소방 알람밸브 구역(Zone) 최적화 및 배관절감`,
                subDescription: `유습식 알람밸브 담당 구역 관로 재배치로 주배관 100A 16m 단축`,
                location: `${subTag} 소방 알람밸브실`,
                impactKw: (32 + (absHash % 35)) * 1000000,
                status: "검토대기"
              }
            ]
          };
        }
      }
      */

      const calculationInputs = ocrResult?.calculationInputs || {};
      const engineeringCalculations = tradeCategory === "소방" ? calculateFireEngineering(calculationInputs) : [];
      const reviewCounts = {
        design: Array.isArray(ocrResult?.designErrors) ? ocrResult.designErrors.length : 0,
        safety: Array.isArray(ocrResult?.safetyItems) ? ocrResult.safetyItems.length : 0,
        ve: Array.isArray(ocrResult?.veItems) ? ocrResult.veItems.length : 0,
        designMinimumMet: (ocrResult?.designErrors?.length || 0) >= 5,
        safetyMinimumMet: (ocrResult?.safetyItems?.length || 0) >= 1,
        veMinimumMet: (ocrResult?.veItems?.length || 0) >= 3,
      };
      return res.json({ success: true, provider, model: provider === 'nvidia' ? nvidiaModels.text : model || getGeminiModel(), data: { ...ocrResult, engineeringCalculations, reviewCounts } });
    } catch (err: any) {
      console.error("Review drawing endpoint error:", err);
      return res.status(502).json({
        error: err.message || "Failed to analyze drawing",
        provider: requestProvider,
        stage: requestProvider === 'nvidia' ? 'NVIDIA Vision/RAG/Text pipeline' : 'Gemini Vision pipeline',
      });
    }
  });

  // API Endpoint: Synthesize a file-level review from page-level visual findings.
  // This second pass reconciles cross-page evidence without inventing drawing coordinates.
  app.post("/api/gemini/synthesize-review", async (req, res) => {
    try {
      const { fileName, docCategory = "도면", tradeCategory = "소방", pageResults } = req.body;
      const provider = req.body.provider || 'gemini';
      const ai = provider === 'nvidia' ? null : getGeminiClient();
      if ((provider !== 'nvidia' && !ai) || !fileName || !pageResults || typeof pageResults !== "object") {
        return res.status(400).json({ error: "fileName, pageResults and GEMINI_API_KEY are required" });
      }

      const synthesisPrompt = `
당신은 ${tradeCategory} 분야의 수석 설계검토 책임자입니다. 아래는 업로드된 ${fileName} (${docCategory})를 페이지별로 시각 검토한 결과입니다.
페이지 결과에 존재하는 증거만 사용하여 파일 전체의 종합 검토를 작성하십시오. 페이지 간 불일치는 명시하고, 확인할 수 없는 내용은 NEEDS_CONFIRMATION으로 표시하십시오. 일반적인 건축 예시나 도면과 무관한 문장을 생성하지 마십시오.

검토 순서:
1) 도면 세트 기본정보와 페이지별 범위 정리
2) 설계 정합성·법규/안전·시공성·타분야 역무범위·원가/VE 분류
3) 동일 이슈 중복 제거 및 심각도 우선순위화
4) 확인된 증거와 확인이 필요한 자료 분리
5) 종합 판단 및 우선 조치 작성

반드시 다음 JSON만 반환하십시오:
{
  "reviewSummary": {"status":"오류 의심|주의|정상|긴급 확인", "result":"한 문장 요약", "description":"근거 중심 종합 판단"},
  "reviewNarrative": {
    "drawingOverview":"도면 세트 개요",
    "checklistReview":[{"number":1,"category":"설계|안전|시공 전|시공 후|타분야 연계|원가·VE","topic":"항목","criteria":"기준","observation":"도면에서 확인한 내용","status":"PASS|FAIL|NEEDS_CONFIRMATION","evidence":"페이지와 증거","legalBasis":"법규·기술기준","responsibleParty":"확인 주체","scopeOwner":"공급·시공·시험 책임","recommendation":"조치"}],
    "preConstructionChecks":["구체적 시공 전 확인"],
    "postConstructionChecks":["구체적 시공 후 확인"],
    "interfaceAndScopeChecks":["구체적 타분야·역무범위 확인"],
    "siteAndConstructionNotes":["현장 확인사항"],
    "overallOpinion":"우선순위가 포함된 종합 의견",
    "requiredDocuments":["필요한 추가 자료"]
  },
  "designErrors": [], "safetyItems": [], "veItems": []
}

페이지별 원자료:
${JSON.stringify(pageResults).slice(0, 180000)}
`;
      let nvidiaRagContext: any[] = [];
      if (provider === 'nvidia' && vectorDbEnabled()) {
        const aggregateEvidence = JSON.stringify({
          tradeCategory,
          docCategory,
          rawOcrText: pageResults.rawOcrText,
          visualFindings: pageResults.visualFindings,
          ruleScreening: pageResults.ruleScreening,
          ragContext: pageResults.ragContext,
        }).slice(0, 12000);
        nvidiaRagContext = await retrieveFromVectorDb(aggregateEvidence, { trade: tradeCategory }, [], 8);
      }
      const finalPrompt = `${synthesisPrompt}\n\nFILE-LEVEL NVIDIA RAG CONTEXT (retrieved once for the complete drawing set):\n${JSON.stringify(nvidiaRagContext)}\nUse these clauses only when they match the page evidence. Preserve page numbers in every finding.\n\n법규 근거 작성 규칙:\n- 각 설계·안전 검토항목마다 적용 조문 codeClause/legalBasis를 하나 이상 연결하십시오.\n- 조문 원문 또는 핵심 기준값을 evidence에 100자 이내로 요약하십시오.\n- 도면에서 확인된 값과 법규 기준값을 분리해 작성하십시오.\n- 일치하지 않거나 자료가 없으면 FAIL 또는 NEEDS_CONFIRMATION으로 표시하고, PASS로 임의 판정하지 마십시오.\n- 원가·VE 항목은 도면에서 확인 가능한 물량·단가가 없으면 금액을 단정하지 말고 산출식과 필요한 자료를 제시하십시오.`;
      const response = provider === 'nvidia' ? { text: await synthesizeNvidiaReview(finalPrompt) } : await ai!.models.generateContent({
        model: getGeminiModel(),
        contents: [{ text: synthesisPrompt }],
        // Controlled JSON output and Google Search cannot be combined on
        // Vertex AI. The page results already carry the local RAG evidence.
        config: { responseMimeType: "application/json", temperature: 0.15, maxOutputTokens: 20000 },
      });
      const synthesisText = extractModelText(response);
      if (!synthesisText) return res.status(502).json({ error: `${provider === 'nvidia' ? 'NVIDIA' : 'Gemini'} synthesis returned no content` });
      let synthesisData = normalizeReviewKeys(JSON.parse(synthesisText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()));
      if (provider === 'nvidia') {
        const evidence = [pageResults.rawOcrText, ...(pageResults.visualFindings || []).map((item: any) => typeof item === 'string' ? item : item.finding || item.evidence || '')].filter(Boolean).join(' ');
        synthesisData = ensureNvidiaReviewItems(synthesisData, evidence, pageResults.ragContext || pageResults.ruleScreening || []);
      }
      return res.json({ success: true, data: synthesisData, model: provider === 'nvidia' ? nvidiaModels.text : getGeminiModel(), provider });
    } catch (error) {
      console.error("Gemini synthesis error:", error);
      return res.status(502).json({ error: "Gemini file-level synthesis failed" });
    }
  });

  // API routes must be registered before Vite's SPA fallback middleware.
  // Otherwise a development-mode POST to /api/gemini/synthesize-review is
  // handled by Vite and returns 404 before the file-level review runs.
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`POSCO AI Engineering Server running on http://0.0.0.0:${PORT}`);
    if (process.env.NODE_ENV !== "production" && process.env.OPEN_BROWSER !== "false") {
      const url = `http://localhost:${PORT}/`;
      setTimeout(() => {
        const command = process.platform === "win32"
          ? `start "" "${url}"`
          : process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
        exec(command, () => undefined);
      }, 800);
    }
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`포트 ${PORT}가 이미 사용 중입니다. 기존 로컬 서버를 종료하거나 현재 실행 중인 http://localhost:${PORT}/를 사용하세요.`);
      process.exitCode = 1;
      return;
    }
    console.error("서버 시작 오류:", error);
    process.exitCode = 1;
  });
}

startServer();
