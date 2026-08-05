import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    connected: true,
    backendDatabase: 'Supabase PostgreSQL (optional)',
    aiEngine: 'Gemini Vision OCR and drawing review',
    timestamp: new Date().toISOString(),
  });
}
