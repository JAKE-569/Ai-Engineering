import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

const stripDataUrl = (value: string) => value.replace(/^data:[^;]+;base64,/, '');

export const config = {
  api: { bodyParser: { sizeLimit: '50mb' } },
  maxDuration: 300,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, mimeType, base64Data, docCategory = '도면', tradeCategory = '소방' } = req.body || {};
  if (!fileName || !base64Data) {
    return res.status(400).json({ error: 'fileName and base64Data are required' });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is not configured in Vercel' });
  }

  try {
    const cleanBase64 = stripDataUrl(base64Data);
    const effectiveMime = mimeType || 'application/pdf';
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are a senior Korean plant engineering drawing reviewer. Review the supplied PDF/image visually, not OCR alone. Inspect geometry, dimensions, symbols, linework, equipment, pipes/cables, spatial relationships, clashes, missing components, and code-relevant evidence. Also extract OCR text. Return only valid JSON with this shape:
{
  "drawingTitle":"string", "drawingNumber":"string", "scale":"string",
  "docCategory":"${docCategory}", "tradeCategory":"${tradeCategory}",
  "rawOcrText":"string", "ocrBlocks":[{"id":"b1","text":"string","category":"표제란|치수|재질|특기사항|소방/안전","confidence":0}],
  "visualFindings":[{"id":"vf1","finding":"string","evidence":"string","xPercent":50,"yPercent":50,"confidence":0}],
  "reviewSummary":{"status":"오류 의심|주의|정상|긴급 확인","result":"string","description":"string"},
  "designErrors":[{"id":"err-1","errorCode":"ERR-001","dwgFile":"${fileName}","description":"string","type":"Structural|Electrical|Mechanical|Civil|Architectural|Fire|Other","severity":"CRITICAL|WARNING|INFO","suggestedFix":"string"}],
  "markups":[{"id":"m1","xPercent":50,"yPercent":50,"title":"string","comment":"string","codeClause":"string","severity":"CRITICAL|WARNING|INFO"}],
  "safetyItems":[], "veItems":[]
}`;
    const isPdf = effectiveMime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const content = isPdf
      ? [
          { type: 'input_file', filename: fileName, file_data: base64Data },
          { type: 'input_text', text: prompt },
        ]
      : [
          { type: 'input_image', image_url: base64Data, detail: 'high' },
          { type: 'input_text', text: prompt },
        ];
    const response = await client.responses.create({
      model: 'gpt-4o-mini',
      input: [{ role: 'user', content } as any],
      text: { format: { type: 'json_object' } },
    });
    if (!response.output_text) return res.status(502).json({ error: 'OpenAI returned an empty review' });
    return res.status(200).json({ success: true, data: JSON.parse(response.output_text.trim()) });
  } catch (error) {
    console.error('OpenAI drawing review failed:', error);
    return res.status(502).json({ error: 'OpenAI drawing review failed' });
  }
}
