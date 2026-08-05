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
  if (!process.env.NVIDIA_API_KEY) {
    return res.status(503).json({ error: 'NVIDIA_API_KEY is not configured in Vercel' });
  }

  try {
    const cleanBase64 = stripDataUrl(base64Data);
    const effectiveMime = mimeType || 'application/pdf';
    const client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      timeout: 90000,
    });
    const prompt = `Visually review this Korean plant engineering drawing, not OCR alone. Identify visible geometry, dimensions, symbols, equipment, pipes/cables, clashes, missing components, and code-relevant evidence. Extract key text. Return concise valid JSON only:
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
    if (effectiveMime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(415).json({ error: 'NVIDIA Vision review requires an image page. Export the PDF page as PNG/JPEG and upload the image.' });
    }
    const response = await client.chat.completions.create({
      model: 'nvidia/nemotron-nano-12b-v2-vl',
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: base64Data, detail: 'high' } },
        ],
      } as any],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 1200,
    });
    const outputText = response.choices[0]?.message?.content;
    if (!outputText || typeof outputText !== 'string') return res.status(502).json({ error: 'NVIDIA returned an empty review' });
    return res.status(200).json({ success: true, data: JSON.parse(outputText.trim()) });
  } catch (error) {
    console.error('NVIDIA drawing review failed:', error);
    return res.status(502).json({ error: 'NVIDIA drawing review failed' });
  }
}
