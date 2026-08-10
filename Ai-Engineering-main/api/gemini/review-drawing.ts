import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const stripDataUrl = (value: string) => value.replace(/^data:[^;]+;base64,/, '');

export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { fileName, mimeType = 'image/png', base64Data, docCategory = '도면', tradeCategory = '소방' } = req.body || {};
  if (!fileName || !base64Data) return res.status(400).json({ error: 'fileName and base64Data are required' });
  if (!process.env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in Vercel' });

  const prompt = `You are a senior Korean ${tradeCategory} engineering design reviewer. Analyze only the actual pixels of this uploaded ${docCategory} page. Never reuse architectural, fire, or other sample findings unless the pixels prove them. If a value, symbol, dimension, or material is not legible, say "확인 불가" and do not invent it. Use the selected discipline checklist: civil—levels, grades, foundations, drainage, quantities and constructability; architectural—room/door dimensions, egress, fire compartments and accessibility; mechanical—equipment capacity, duct/pipe sizing, slope, access and clash; electrical—single-line intent, cable routes, tray fill, grounding and clearances; fire—zones, heads, valves, detection, hydraulic evidence and code clearances. Compare visible geometry and text against applicable KDS/KEC/NFTC/building standards only when the clause is supported by visible evidence. For every finding include the exact visible evidence, page number, coordinate, confidence, and whether it is DESIGN_ERROR, SAFETY, COST_VE, or PASS. Cost VE must be returned only when a visible quantity, material, labor, or route optimization is grounded in the page. Return only JSON with this shape:
{
  "drawingTitle":"string", "drawingNumber":"string", "scale":"string",
  "docCategory":"${docCategory}", "tradeCategory":"${tradeCategory}",
  "rawOcrText":"string",
  "ocrBlocks":[{"id":"b1","text":"string","category":"title|dimension|note|symbol|safety","confidence":0}],
  "visualFindings":[{"id":"vf1","finding":"PASS|VERIFY|defect: concise finding","evidence":"visible evidence","pageNumber":1,"xPercent":50,"yPercent":50,"confidence":0}],
  "reviewSummary":{"status":"오류 의심|주의|정상|기준 확인","result":"string","description":"string"},
  "designErrors":[{"id":"err-1","errorCode":"ERR-001","dwgFile":"${fileName}","description":"string","type":"Structural|Electrical|Mechanical|Civil|Architectural|Fire|Other","severity":"CRITICAL|WARNING|INFO","suggestedFix":"string"}],
  "markups":[{"id":"m1","xPercent":50,"yPercent":50,"title":"string","comment":"string","category":"DESIGN_ERROR|SAFETY|COST_VE","codeClause":"string","severity":"CRITICAL|WARNING|INFO"}],
  "safetyItems":[{"summary":"string","lawRegulation":"string","severity":"?꾪뿕|二쇱쓽|?뺤긍","status":"string","details":"string"}],
  "veItems":[{"type":"VE ?쒖븞","description":"only if a grounded cost or quantity optimization is visible","subDescription":"string","location":"string","beforeCostKw":0,"afterCostKw":0,"impactKw":0,"savingsRate":0,"scheduleDays":0,"calculationBasis":"visible quantity/material/labor evidence","status":"寃?좊?湲?","detailItems":[{"label":"material or labor","quantity":"string","unitPrice":0,"amount":0,"formula":"string"}]}]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ['gemini-3-flash-preview'];
    let lastError: any = null;
    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { role: 'user', parts: [
            { inlineData: { mimeType, data: stripDataUrl(base64Data) } },
            { text: prompt },
          ] },
          config: { responseMimeType: 'application/json', temperature: 0.1 },
        });
        const output = response.text?.trim();
        if (!output) throw new Error(`${model} returned an empty review`);
        return res.status(200).json({ success: true, model, data: JSON.parse(output) });
      } catch (error: any) {
        lastError = error;
        const status = Number(error?.status || error?.response?.status);
        if (model === models[0] && (status === 429 || status >= 500)) continue;
        break;
      }
    }
    const status = Number(lastError?.status || lastError?.response?.status);
    if (status === 429) return res.status(429).json({ error: 'Gemini model rate limits exceeded. Please retry after quota refresh.' });
    throw lastError || new Error('Gemini returned no review');
  } catch (error: any) {
    const status = Number(error?.status || error?.response?.status);
    if (status === 429) return res.status(429).json({ error: 'Gemini API rate limit exceeded. Please retry after the quota refresh.' });
    console.error('Gemini Vision drawing review failed:', error?.message || error);
    return res.status(502).json({ error: 'Gemini Vision drawing review failed' });
  }
}
