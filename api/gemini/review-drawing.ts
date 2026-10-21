import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';
import { GoogleAuth } from 'google-auth-library';
// Keep the extension explicit: Vercel runs this function as native ESM.
import { retrieveRules as retrieveLocalRules, runRuleScreening } from '../../src/data/dummyRulesDb.js';
import constructionRulesFullDb from '../../src/data/constructionRulesDb.js';
import fullFireRulesDb from '../../src/data/fireRulesFullDb.json' with { type: 'json' };
import { explainNetworkError } from '../../local-network.js';

export const config = { api: { bodyParser: { sizeLimit: '50mb' } }, maxDuration: 300 };

const stripDataUrl = (value: string) => value.replace(/^data:[^;]+;base64,/, '');
const models = {
  vision: process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  embedding: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nemotron-3-embed-1b',
  text: process.env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b',
};
async function nvidiaPost(path: string, body: unknown) {
  // Keep one slow stage from consuming Vercel's entire 300s function budget.
  const maxAttempts = Math.max(1, Number(process.env.NVIDIA_MAX_ATTEMPTS || 1));
  const defaultTimeout = path.includes('/embeddings') ? 45000 : path.includes('/chat/completions') ? 120000 : 150000;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Number(process.env.NVIDIA_REQUEST_TIMEOUT_MS || defaultTimeout));
    try {
      const response = await fetch(`https://integrate.api.nvidia.com/v1${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` }, body: JSON.stringify(body), signal: controller.signal });
      const text = await response.text();
      if (!response.ok) throw new Error(`NVIDIA API ${response.status}: ${text.slice(0, 500)}`);
      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
    } finally { clearTimeout(timer); }
  }
  throw lastError || new Error('NVIDIA API request failed');
}
async function retrieveNvidiaRules(query: string, trade: string, limit = 8) {
  const [embeddingResponse] = await Promise.all([nvidiaPost('/embeddings', { model: models.embedding, input: [query], input_type: 'query' })]);
  const vector = embeddingResponse.data?.[0]?.embedding;
  if (!vector) throw new Error('NVIDIA embedding response did not contain a vector');
  const url = process.env.SUPABASE_URL!.replace(/\/$/, '');
  const response = await fetch(`${url}/rest/v1/rpc/match_engineering_rules`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` }, body: JSON.stringify({ query_embedding: vector, match_trade: trade || null, match_count: Math.max(limit * 4, 20) }) });
  if (!response.ok) throw new Error(`Supabase RAG ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const rows = await response.json() as any[];
  return rows.slice(0, limit).map((row) => ({ ...row, retrievalScore: Number(row.similarity || 0) }));
}
async function synthesize(prompt: string) {
  // Add a clean language contract independently of legacy prompt literals.
  // This prevents NVIDIA from defaulting to English when an older Korean
  // prompt string has an encoding issue.
  prompt = `${prompt}\n\nLANGUAGE CONTRACT (MANDATORY): Write every user-visible field in Korean (한국어), including title, description, evidence, summary, status explanation and recommendations. Do not output English prose or placeholders such as Not provided, Unknown, or Safety review required. Keep model/API names and legal codes such as NFPC 103, NFTC 103, KEC and KDS unchanged.`;
  const result = await nvidiaPost('/chat/completions', { model: models.text, messages: [{ role: 'system', content: '한국어 전문 엔지니어링 설계검토 보고서 작성자입니다. 법규코드는 원문 그대로 유지하고 모든 설명은 자연스러운 한국어로 작성하세요. JSON만 반환하세요.' }, { role: 'user', content: prompt }], temperature: 0.2, max_tokens: 6144, response_format: { type: 'json_object' }, chat_template_kwargs: { enable_thinking: false } });
  return result.choices?.[0]?.message?.content || '';
}
// Opt-in so deployments without Google credentials never wait on ADC lookup.
const visionUsesAdc = () => /^(1|true|yes)$/i.test(process.env.GOOGLE_CLOUD_VISION_USE_ADC || '');
let visionAuth: GoogleAuth | null = null;
async function cloudVisionRequest() {
  const endpoint = 'https://vision.googleapis.com/v1/images:annotate';
  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (apiKey) return { url: `${endpoint}?key=${encodeURIComponent(apiKey)}`, headers: {} as Record<string, string> };
  if (!visionUsesAdc()) return null;
  // Application Default Credentials (gcloud auth application-default login,
  // or GOOGLE_APPLICATION_CREDENTIALS). The ADC quota project is sent as
  // x-goog-user-project, which Vision requires for user credentials.
  visionAuth ||= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  let client: Awaited<ReturnType<GoogleAuth['getClient']>>;
  let authHeaders: Headers;
  try {
    client = await visionAuth.getClient();
    authHeaders = await client.getRequestHeaders(endpoint);
  } catch (error: any) {
    throw new Error(`Google Cloud Vision ADC login failed (run: gcloud auth application-default login): ${error?.message || error}`);
  }
  const headers: Record<string, string> = {};
  authHeaders.forEach((value, key) => { headers[key] = value; });
  const quotaProject = process.env.GOOGLE_CLOUD_QUOTA_PROJECT || (client as any).quotaProjectId;
  if (quotaProject && !headers['x-goog-user-project']) headers['x-goog-user-project'] = quotaProject;
  return { url: endpoint, headers };
}
// After an auth/permission failure (API disabled, bad key, login expired),
// stop calling Vision for a while so every page does not pay for it again.
let visionPausedUntil = 0;
let visionPauseReason = '';
async function cloudVisionOcr(base64Data: string, mimeType: string) {
  if (visionPausedUntil > Date.now()) throw new Error(`paused after earlier failure: ${visionPauseReason}`);
  try {
    return await cloudVisionOcrOnce(base64Data, mimeType);
  } catch (error: any) {
    const message = String(error?.message || error);
    if (/Vision (400|401|403|404)\b|ADC login failed/.test(message)) {
      visionPausedUntil = Date.now() + 10 * 60 * 1000;
      visionPauseReason = message.slice(0, 160);
    }
    throw error;
  }
}
async function cloudVisionOcrOnce(base64Data: string, mimeType: string) {
  const request = await cloudVisionRequest();
  if (!request) return { configured: false, text: '', blocks: [] };
  const response = await fetch(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...request.headers },
    body: JSON.stringify({ requests: [{ image: { content: stripDataUrl(base64Data) }, features: [{ type: 'DOCUMENT_TEXT_DETECTION', model: 'builtin/latest' }, { type: 'TEXT_DETECTION' }], imageContext: { languageHints: ['ko', 'en'] } }] }),
  });
  if (!response.ok) throw new Error(`Google Cloud Vision ${response.status}: ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json() as any;
  const annotation = payload.responses?.[0] || {};
  const text = annotation.fullTextAnnotation?.text || annotation.textAnnotations?.[0]?.description || '';
  const blocks = (annotation.textAnnotations || []).slice(1, 120).map((item: any) => {
    const vertices = item.boundingPoly?.vertices || [];
    const xs = vertices.map((v: any) => Number(v.x || 0));
    const ys = vertices.map((v: any) => Number(v.y || 0));
    return { text: item.description, bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
  });
  return { configured: true, text, blocks };
}
const parseJson = (value: string) => {
  const clean = value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(clean); } catch { const a = clean.indexOf('{'); const b = clean.lastIndexOf('}'); return a >= 0 && b > a ? JSON.parse(clean.slice(a, b + 1)) : null; }
};
// Highest capability first; each later model is tried only when the one
// before it is out of quota (429), not offered to this key (403/404) or
// overloaded or slow (5xx/timeout). The model actually used is reported in
// the result. Only models with a Gemini API free tier are listed; paid-only
// models (Gemini 4 Argon, 3.1 Pro) can be added through GEMINI_MODELS.
const DEFAULT_GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const splitModels = (value?: string) => (value || '').split(',').map((model) => model.trim()).filter(Boolean);
function geminiModelChain(uiModel?: string) {
  // GEMINI_MODELS replaces the whole order. GEMINI_MODEL/GEMINI_FALLBACK_MODELS
  // are the earlier, narrower settings and still win over the default.
  const configured = splitModels(process.env.GEMINI_MODELS);
  if (configured.length) return [...new Set(configured)];
  if (process.env.GEMINI_MODEL || process.env.GEMINI_FALLBACK_MODELS) {
    return [...new Set([process.env.GEMINI_MODEL || uiModel || 'gemini-3.6-flash', ...splitModels(process.env.GEMINI_FALLBACK_MODELS)])];
  }
  return DEFAULT_GEMINI_MODELS;
}
// model -> time (ms) until which it is skipped. Shared by every page request
// the server handles, so a model that hit its daily limit is not retried on
// each page.
const exhaustedModels = new Map<string, number>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function runGeminiReview(input: { fileName: string; mimeType: string; base64Data: string; pageNumber: number; totalPages: number; docCategory: string; tradeCategory: string; model?: string; rules?: any[]; cloudVisionText?: string }) {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured (local: .env file, deployed: Vercel environment variables)');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `당신은 ${input.tradeCategory} 분야의 수석 설계검토 전문가입니다. 업로드된 실제 도면 이미지와 Google Cloud Vision OCR 결과만 근거로 ${input.pageNumber}/${input.totalPages} 페이지를 검토하세요. 도면과 무관한 예시 의견을 작성하지 마세요. 확인할 수 없는 값은 확인 불가로 표시하세요. 설계오류뿐 아니라 안전, 법규, 시공 전후 확인사항, 타분야 인터페이스, 원가절감(VE)을 구분하세요. 아래 검색된 법규 조항을 검토 기준으로 사용하되, 도면에서 확인되지 않는 사항은 NEEDS_CONFIRMATION으로 표시하세요. 모든 항목에 도면 근거와 실제 적용한 법규 조항의 codeClause를 기재하고 JSON만 반환하세요. Google Cloud Vision OCR: ${input.cloudVisionText || 'OCR 결과 없음'}. 검색 법규/RAG 근거: ${JSON.stringify(input.rules || [])}. 다음 구조를 사용하세요: {"drawingTitle":"","drawingNumber":"","scale":"","rawOcrText":"","ocrBlocks":[],"visualFindings":[],"designItems":[],"safetyItems":[],"veItems":[],"findings":[],"summary":"","reviewStatus":"심각|주의|양호"}. 각 검토항목은 title, description, evidence, codeClause, severity, status, xPercent, yPercent를 포함해야 합니다.`;
  const candidates = geminiModelChain(input.model);
  const timeout = Number(process.env.GEMINI_TIMEOUT_MS || 120000);
  // When every model is parked, wait for the one that frees up first if that
  // is soon (per-minute limits, brief overloads); otherwise fail right away
  // instead of re-sending requests that will be refused.
  const maxWaitMs = Number(process.env.GEMINI_MAX_WAIT_MS || 90000);
  let lastError: unknown;
  for (let attempt = 0; attempt < candidates.length * 3; attempt += 1) {
    const now = Date.now();
    let model = candidates.find((name) => (exhaustedModels.get(name) || 0) <= now);
    if (!model) {
      const soonest = candidates.reduce((best, name) => (exhaustedModels.get(name)! < exhaustedModels.get(best)! ? name : best));
      const waitMs = exhaustedModels.get(soonest)! - now;
      if (waitMs > maxWaitMs) {
        const error: any = new Error(`All Gemini models are out of quota or unavailable (${candidates.join(', ')}). The free daily limit resets at midnight Pacific time (16:00-17:00 KST); a paid plan removes it. Next model available in ${waitMs < 120000 ? `${Math.ceil(waitMs / 1000)}s` : `${Math.ceil(waitMs / 60000)} min`}.`);
        error.status = 429;
        error.allModelsExhausted = true;
        throw error;
      }
      console.warn(`All Gemini models are busy; waiting ${Math.ceil(waitMs / 1000)}s for ${soonest} (page ${input.pageNumber}).`);
      await sleep(waitMs);
      model = soonest;
    }
    try {
      const response = await ai.models.generateContent({ model, contents: { role: 'user', parts: [{ inlineData: { mimeType: input.mimeType, data: stripDataUrl(input.base64Data) } }, { text: prompt }] }, config: { responseMimeType: 'application/json', temperature: 0.15, httpOptions: { timeout } } });
      const text = response.text?.trim() || '';
      const data = parseJson(text);
      if (!data) throw new Error('Gemini returned a non-JSON review response');
      return { ...data, _modelUsed: model };
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.status || error?.response?.status || error?.error?.code);
      const timedOut = error?.name === 'AbortError' || /aborted|timeout/i.test(String(error?.message || ''));
      // Park a failing model so later pages go straight to one that works,
      // instead of paying for the same failure on every page.
      if (status === 429) {
        const text = String(error?.message || '');
        const retrySeconds = Number(text.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1] || 0);
        const perDay = /PerDay/i.test(text);
        const cooldownMs = perDay ? 60 * 60 * 1000 : Math.max(retrySeconds * 1000 + 1000, 10 * 1000);
        exhaustedModels.set(model, Date.now() + cooldownMs);
        console.warn(`Gemini model ${model} is out of quota (429${perDay ? ', daily limit' : ', per-minute limit'}); skipping it for ${perDay ? '60 min' : `${Math.round(cooldownMs / 1000)}s`}.`);
        continue;
      }
      if (status === 403 || status === 404) {
        exhaustedModels.set(model, Date.now() + 60 * 60 * 1000);
        console.warn(`Gemini model ${model} not available to this API key (${status}); skipping it for 60 min.`);
        continue;
      }
      if ([500, 502, 503, 504].includes(status) || timedOut) {
        exhaustedModels.set(model, Date.now() + (timedOut ? 3 * 60 * 1000 : 30 * 1000));
        console.warn(`Gemini model ${model} ${timedOut ? `timed out after ${Math.round(timeout / 1000)}s; skipping it for 3 min` : `overloaded (${status}); skipping it for 30s`}.`);
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('Gemini returned no review');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { fileName, mimeType = 'image/png', base64Data, pdfText = '', pageNumber = 1, totalPages = 1, docCategory = '도면', tradeCategory = '소방', provider = 'gemini' } = req.body || {};
  if (!fileName || !base64Data) return res.status(400).json({ error: 'fileName and base64Data are required' });
  if (provider === 'gemini') {
    try {
      // Gemini uses the local keyword rule database only. Supabase pgvector is
      // intentionally reserved for the NVIDIA pipeline.
      // Vision OCR is optional input. If it cannot be reached (e.g. a company
      // firewall), review with Gemini alone and report why OCR was skipped.
      let visionOcr: { configured: boolean; text: string; blocks: any[]; error?: string };
      try {
        visionOcr = await cloudVisionOcr(base64Data, mimeType);
        if (visionOcr.configured) console.log(`Google Cloud Vision OCR used: page ${pageNumber}, ${visionOcr.text.length} chars, ${visionOcr.blocks.length} text blocks`);
      } catch (error: any) {
        const visionError = `Google Cloud Vision OCR skipped: ${explainNetworkError(error)}`;
        if (!/paused after earlier failure/.test(visionError)) console.error(`${visionError.slice(0, 400)} (Vision is paused for 10 min)`);
        visionOcr = { configured: true, text: '', blocks: [], error: visionError };
      }
      const initialRules = retrieveLocalRules({ trade: tradeCategory, docCategory, fileName });
      let data = await runGeminiReview({ fileName, mimeType, base64Data, pageNumber, totalPages, docCategory, tradeCategory, model: req.body?.model, rules: initialRules, cloudVisionText: visionOcr.text });
      // Re-run the same local keyword search against the model's observed text.
      // This is deliberately not vector search: Gemini remains local-keyword-only.
      const observedText = [
        data.rawOcrText,
        ...(data.ocrBlocks || []).map((item: any) => typeof item === 'string' ? item : item.text),
        ...(data.visualFindings || []).map((item: any) => typeof item === 'string' ? item : `${item.title || ''} ${item.finding || ''} ${item.description || ''} ${item.evidence || ''}`),
        ...(data.designItems || []).map((item: any) => `${item.title || ''} ${item.description || ''} ${item.evidence || ''}`),
        ...(data.safetyItems || []).map((item: any) => `${item.title || ''} ${item.summary || ''} ${item.details || ''} ${item.evidence || ''}`),
      ].filter(Boolean).join('\n').slice(0, 18000);
      const contentRules = retrieveLocalRules({ trade: tradeCategory, docCategory, fileName, text: observedText });
      const rules = Array.from(new Map([...initialRules, ...contentRules].map((rule: any) => [rule.id, rule])).values());
      const screenedRules = runRuleScreening(rules, observedText);
      const terms = observedText.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((term: string) => term.length >= 2);
      const clauseCandidates = [...(fullFireRulesDb.clauses || []), ...(constructionRulesFullDb.clauses || [])]
        .map((clause: any) => {
          const clauseText = `${clause.code || ''} ${clause.clause || ''} ${clause.text || ''}`.toLowerCase();
          const score = terms.reduce((count: number, term: string) => count + (clauseText.includes(term) ? 1 : 0), 0);
          return { clause, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ clause }) => ({ code: clause.code, title: clause.clause, text: clause.text, source: { title: clause.code, url: clause.sourceUrl, publisher: clause.publisher } }));
      const enrichedRules = [...rules.map((rule: any) => ({ code: rule.code, title: rule.title, text: rule.title, severity: rule.severity, source: rule.source })), ...clauseCandidates];
      // A second, evidence-grounded pass gives Gemini the actual clauses found
      // from OCR content instead of only filename-level rules.
      if (enrichedRules.length > initialRules.length) {
        try {
          data = await runGeminiReview({ fileName, mimeType, base64Data, pageNumber, totalPages, docCategory, tradeCategory, model: req.body?.model, rules: enrichedRules, cloudVisionText: visionOcr.text });
        } catch (error: any) {
          // Keep the first-pass review rather than discarding a page that
          // already succeeded (and was already paid for).
          console.warn(`Gemini second pass skipped for page ${pageNumber}; using the first-pass review: ${explainNetworkError(error).slice(0, 200)}`);
        }
      }
      const ruleByText = (item: any) => {
        const text = `${item.title || ''} ${item.summary || ''} ${item.description || ''} ${item.details || ''} ${item.evidence || ''}`.toLowerCase();
        return rules.find((rule: any) => rule.keywords.some((keyword: string) => text.includes(keyword.toLowerCase())));
      };
      for (const collection of [data.designItems, data.safetyItems, data.veItems, data.findings]) {
        if (!Array.isArray(collection)) continue;
        for (const item of collection) {
          const matchedRule = ruleByText(item);
          if (matchedRule) {
            item.codeClause = item.codeClause || item.legalBasis || item.lawRegulation || matchedRule.code;
            item.legalBasis = item.legalBasis || item.codeClause || matchedRule.code;
            item.evidence = item.evidence || `${matchedRule.code} ${matchedRule.title}`;
          }
        }
      }
      data.ruleScreening = screenedRules;
      data.cloudVision = { configured: visionOcr.configured, ocrText: visionOcr.text, blocks: visionOcr.blocks, ...(visionOcr.error ? { error: visionOcr.error } : {}) };
      data.localRuleContext = [...enrichedRules, ...screenedRules.map((rule: any) => ({ code: rule.code, title: rule.title, text: rule.evidence, severity: rule.severity, source: rule.source }))]
        .filter((rule: any, index: number, list: any[]) => list.findIndex((item) => item.code === rule.code && item.title === rule.title) === index);
      const modelUsed = data._modelUsed;
      delete data._modelUsed;
      data.engine = { provider: 'gemini', model: modelUsed, modelOrder: geminiModelChain(req.body?.model), legalSearch: 'local-keyword-rules' };
      return res.status(200).json({ success: true, provider: 'gemini', model: modelUsed, data });
    } catch (error: any) {
      const detail = explainNetworkError(error);
      console.error('Gemini drawing review failed:', detail);
      if (error?.allModelsExhausted) return res.status(429).json({ error: 'Gemini quota exhausted', detail });
      return res.status(502).json({ error: 'Gemini drawing review failed', detail });
    }
  }
  if (provider !== 'nvidia') return res.status(400).json({ error: `Unsupported review provider: ${provider}` });
  if (!process.env.NVIDIA_API_KEY) return res.status(503).json({ error: 'NVIDIA_API_KEY is not configured (local: .env file, deployed: Vercel environment variables)' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Supabase RAG environment is not configured (local: .env file, deployed: Vercel environment variables)' });

  try {
    const data = stripDataUrl(base64Data);
    const imageUrl = `data:${mimeType};base64,${data}`;
    const vision = await nvidiaPost('/chat/completions', {
      model: models.vision,
      messages: [
        { role: 'system', content: 'You are a precision engineering drawing extraction model. Return only observable, location-specific facts. Use UNREADABLE for values that cannot be read. Never repeat generic descriptions. Return JSON only.' },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: `Extract page ${pageNumber}/${totalPages} of ${fileName}. Read title block, drawing title/number/scale, Korean labels, symbols, dimensions, pipes, equipment, layout relationships, clashes and safety-relevant visual evidence. Return JSON with drawingTitle, drawingNumber, scale, rawOcrText, ocrBlocks, visualFindings and extractedMeasurements. Each visualFinding must include finding, evidence, xPercent and yPercent.` },
        ] },
      ],
      temperature: 0.4,
      top_p: 0.9,
      max_tokens: 4096,
    });
    const message = vision.choices?.[0]?.message || {};
    const visionText = String(message.content || message.reasoning_content || '').trim();
    const rawExtracted = parseJson(visionText) || { drawingTitle: '', drawingNumber: '', scale: '', rawOcrText: visionText, ocrBlocks: [], visualFindings: [], extractedMeasurements: {} };
    // NVIDIA may return a single object/string instead of an array for OCR
    // blocks or visual findings. Normalize these fields before RAG/rule use.
    const visionTitle = String(rawExtracted.drawingTitle || '').trim();
    // Vision sometimes mistakes a pipe-size label such as "50(100)" for the
    // title block. Do not let that single numeric token replace a useful title.
    const isUsefulDrawingTitle = visionTitle.length >= 8
      && !/^[-\d\s()./]+$/.test(visionTitle)
      && visionTitle !== 'UNREADABLE';
    const fallbackDrawingTitle = fileName;
    const extracted = {
      ...rawExtracted,
      drawingTitle: isUsefulDrawingTitle ? visionTitle : fallbackDrawingTitle,
      rawOcrText: rawExtracted.rawOcrText && rawExtracted.rawOcrText !== 'UNREADABLE' ? rawExtracted.rawOcrText : pdfText,
      ocrBlocks: Array.isArray(rawExtracted.ocrBlocks) ? rawExtracted.ocrBlocks : rawExtracted.ocrBlocks ? [rawExtracted.ocrBlocks] : [],
      visualFindings: Array.isArray(rawExtracted.visualFindings) ? rawExtracted.visualFindings : rawExtracted.visualFindings ? [rawExtracted.visualFindings] : [],
    };
    const evidence = [pdfText, extracted.rawOcrText, ...extracted.ocrBlocks.map((x: any) => typeof x === 'string' ? x : x.text || JSON.stringify(x)), ...extracted.visualFindings.map((x: any) => typeof x === 'string' ? x : `${x.finding || ''} ${x.evidence || ''}`), JSON.stringify(extracted.extractedMeasurements || {}), fileName].filter(Boolean).join('\n').slice(0, 18000);
    const rules = await retrieveNvidiaRules(`${tradeCategory} ${docCategory}\n${evidence}`, tradeCategory, 8);
    const ragContext = rules.map((r: any) => ({ code: r.code, title: r.title || r.clause, text: r.content || r.text, severity: r.severity, source: r.source || { title: r.code }, retrievalScore: r.retrievalScore }));
    // Text synthesis may fail after Vision/RAG have produced evidence. In that
    // case only the Vision model's own findings are returned, flagged partial;
    // nothing is invented from rules or templates.
    let synthesis = '';
    let synthesisError = '';
    try {
      synthesis = await synthesize(`업로드 도면 ${fileName}, ${pageNumber}/${totalPages} 페이지를 검토하세요.\n\n도면에서 추출한 사실:\n${evidence}\n\n검색된 국내 법규/RAG 근거:\n${JSON.stringify(ragContext)}\n\n다음 JSON만 반환하세요: {"designItems":[],"safetyItems":[],"veItems":[],"findings":[],"summary":"", "reviewStatus":"심각|주의|양호"}. 각 항목은 title, description, evidence, codeClause, severity, status, xPercent, yPercent를 포함하세요. 확인할 수 없는 내용은 NEEDS_CONFIRMATION으로 표시하고 도면과 무관한 예시 의견은 작성하지 마세요.`);
    } catch (error: any) {
      synthesisError = explainNetworkError(error);
      console.error('NVIDIA synthesis failed:', synthesisError);
    }
    let review = parseJson(synthesis);
    let partial = false;
    if (!review || typeof review !== 'object') {
      if (extracted.visualFindings.length === 0) {
        return res.status(502).json({ error: 'NVIDIA RAG drawing review failed', detail: synthesisError || 'NVIDIA synthesis returned no usable JSON review' });
      }
      const visionItems = extracted.visualFindings.map((finding: any, index: number) => ({
        title: finding.finding || `도면 확인 항목 ${index + 1}`,
        description: finding.evidence || finding.finding || '도면에서 확인된 시각 정보에 대한 추가 검토가 필요합니다.',
        evidence: finding.evidence || finding.finding || '도면상 확인 근거 미기재',
        codeClause: '법규 근거 미확인', severity: 'WARNING', status: 'NEEDS_CONFIRMATION', pageNumber,
        xPercent: finding.xPercent, yPercent: finding.yPercent,
      }));
      review = { designItems: visionItems, safetyItems: [], veItems: [], findings: visionItems, summary: 'NVIDIA 종합 검토에 실패하여 Vision 추출 결과만 표시합니다. 법규 검토는 수행되지 않았습니다.', reviewStatus: '주의' };
      partial = true;
    }
    const screenedRules = runRuleScreening(rules as any, evidence);
    const attachPageAndEvidence = (items: any[] = []) => items.map((item) => ({
      ...item,
      pageNumber: Number(item.pageNumber) || pageNumber,
      codeClause: item.codeClause || item.legalBasis || '법규 근거 미확인',
      evidence: item.evidence || '도면상 확인 근거 미기재',
      status: item.status || (item.codeClause || item.legalBasis ? 'REVIEW' : 'NEEDS_CONFIRMATION'),
    }));
    review.designItems = attachPageAndEvidence(review.designItems);
    review.safetyItems = attachPageAndEvidence(review.safetyItems);
    review.veItems = attachPageAndEvidence(review.veItems);
    review.findings = attachPageAndEvidence(review.findings);
    return res.status(200).json({ success: true, provider: 'nvidia', model: models.text, data: { ...extracted, ...review, partial, ...(synthesisError ? { synthesisError } : {}), ragContext, ruleScreening: screenedRules, engine: { provider: 'nvidia', visionModel: models.vision, embeddingModel: models.embedding, textModel: models.text, rag: 'supabase-pgvector', ruleEngine: 'runRuleScreening' } } });
  } catch (error: any) {
    const detail = explainNetworkError(error);
    console.error('NVIDIA RAG drawing review failed:', detail);
    return res.status(502).json({ error: 'NVIDIA RAG drawing review failed', detail });
  }
}
