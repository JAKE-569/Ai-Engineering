import type { VercelRequest, VercelResponse } from '@vercel/node';
import { listPgptModels, pgptModels, reviewAiError, reviewAiHttpStatus } from '../../src/services/pgptService.js';
import { saveModelSettings } from '../../src/services/pgptModelSettingsStore.js';
import type { PgptModelSettings } from '../../src/lib/pgptModelSettings.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'PUT'].includes(req.method || '')) return res.status(405).json({ error: 'Method not allowed' });
  // Match the same-origin restriction on the local review store.
  try {
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return res.status(403).json({ error: '다른 사이트에서는 모델 설정에 접근할 수 없습니다.' });
  } catch { return res.status(403).json({ error: '올바르지 않은 요청 출처입니다.' }); }
  try {
    if (req.method === 'PUT' && (typeof req.body?.gpt !== 'string' || typeof req.body?.claude !== 'string')) return res.status(400).json({ error: 'GPT와 Claude 기본 모델을 선택하세요.' });
    const available = await listPgptModels();
    const settings = {} as PgptModelSettings;
    for (const provider of ['gpt', 'claude'] as const) {
      const previous = pgptModels(provider);
      const defaultModel = req.method === 'PUT' ? req.body[provider] : previous[0];
      if (req.method === 'PUT' && !available[provider].includes(defaultModel) && !previous.includes(defaultModel)) return res.status(400).json({ error: 'P-GPT에 등록되지 않은 모델입니다: ' + provider });
      settings[provider] = { models: [...new Set([...previous, ...available[provider]])], defaultModel };
    }
    if (req.method === 'PUT') saveModelSettings(settings);
    return res.status(200).json({ settings, available });
  } catch (error) { return res.status(reviewAiHttpStatus(error)).json({ error: '모델 설정 ' + (req.method === 'PUT' ? '저장' : '조회') + ' 실패', detail: reviewAiError(error) }); }
}
