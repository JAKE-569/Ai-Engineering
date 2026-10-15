import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    connected: true,
    backendDatabase: process.env.SUPABASE_URL ? 'Supabase PostgreSQL + pgvector RAG' : 'Supabase not configured',
    aiEngines: {
      gemini: { model: process.env.VERTEX_AI_MODEL || 'gemini-3.6-flash', configured: Boolean(process.env.GEMINI_API_KEY) },
      cloudVision: {
        provider: 'Google Cloud Vision API',
        feature: 'DOCUMENT_TEXT_DETECTION + TEXT_DETECTION',
        configured: Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY) || /^(1|true|yes)$/i.test(process.env.GOOGLE_CLOUD_VISION_USE_ADC || ''),
        auth: process.env.GOOGLE_CLOUD_VISION_API_KEY ? 'api-key' : /^(1|true|yes)$/i.test(process.env.GOOGLE_CLOUD_VISION_USE_ADC || '') ? 'adc' : 'none',
      },
      nvidia: {
        vision: process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        embedding: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nemotron-3-embed-1b',
        text: process.env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b',
        configured: Boolean(process.env.NVIDIA_API_KEY),
      },
    },
    nvidiaRag: { configured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), collection: process.env.VECTOR_DB_COLLECTION || 'engineering_rules' },
    timestamp: new Date().toISOString(),
  });
}
