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

  const prompt = `You are a senior Korean plant engineering reviewer. Analyze the actual pixels of this uploaded ${docCategory} for the ${tradeCategory} discipline. Do not rely on OCR alone. Inspect title block, dimensions, levels, symbols, equipment, pipes/ducts/cables, routes, clearances, connections, clashes, omissions, constructability, safety, and visible code evidence. Return PASS, VERIFY, or a specific defect for each relevant area. Do not invent geometry. When visible content exists, provide at least 3 grounded visualFindings with evidence and coordinates. Return only JSON with this shape:
{
  "drawingTitle":"string", "drawingNumber":"string", "scale":"string",
  "docCategory":"${docCategory}", "tradeCategory":"${tradeCategory}",
  "rawOcrText":"string",
  "ocrBlocks":[{"id":"b1","text":"string","category":"title|dimension|note|symbol|safety","confidence":0}],
  "visualFindings":[{"id":"vf1","finding":"PASS|VERIFY|defect: concise finding","evidence":"visible evidence","xPercent":50,"yPercent":50,"confidence":0}],
  "reviewSummary":{"status":"오류 의심|주의|정상|기준 확인","result":"string","description":"string"},
  "designErrors":[{"id":"err-1","errorCode":"ERR-001","dwgFile":"${fileName}","description":"string","type":"Structural|Electrical|Mechanical|Civil|Architectural|Fire|Other","severity":"CRITICAL|WARNING|INFO","suggestedFix":"string"}],
  "markups":[{"id":"m1","xPercent":50,"yPercent":50,"title":"string","comment":"string","codeClause":"string","severity":"CRITICAL|WARNING|INFO"}],
  "safetyItems":[], "veItems":[]
}`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [
        { inlineData: { mimeType, data: stripDataUrl(base64Data) } },
        { text: prompt },
      ] },
      config: { responseMimeType: 'application/json', temperature: 0.1 },
    });
    const output = response.text?.trim();
    if (!output) return res.status(502).json({ error: 'Gemini returned an empty review' });
    return res.status(200).json({ success: true, data: JSON.parse(output) });
  } catch (error: any) {
    const status = Number(error?.status || error?.response?.status);
    if (status === 429) return res.status(429).json({ error: 'Gemini API rate limit exceeded. Please retry after the quota refresh.' });
    console.error('Gemini Vision drawing review failed:', error?.message || error);
    return res.status(502).json({ error: 'Gemini Vision drawing review failed' });
  }
}
