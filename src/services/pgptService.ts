import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { geminiBaseUrl } from './geminiService.js';
import { parseModelJson } from '../lib/reviewNormalization.js';

export type PgptProvider = 'gpt' | 'claude';
export interface JsonOptions { model?: string; image?: { mimeType: string; data: string }; deadlineMs?: number; }
type CallStatus = { success: boolean; at: string; model: string; responseModel?: string; error?: string };
const lastCalls: Partial<Record<PgptProvider, CallStatus>> = {};
const key = () => process.env.PGPT_API_KEY || process.env.GEMINI_API_KEY;
const prefix = (provider: PgptProvider) => provider === 'gpt' ? 'PGPT_GPT' : 'PGPT_CLAUDE';
export function pgptModels(provider: PgptProvider): string[] {
  const p = prefix(provider);
  return [...new Set((process.env[p + '_MODELS'] || process.env[p + '_MODEL'] || (provider === 'gpt' ? 'gpt-5.4' : 'claude-sonnet-4.6')).split(',').map(s => s.trim()).filter(Boolean))];
}
export function pgptBaseUrl(provider: PgptProvider) {
  return (process.env[prefix(provider) + '_BASE_URL'] || (provider === 'gpt' ? geminiBaseUrl() + '/v1' : geminiBaseUrl())).replace(/\/+$/, '');
}
export function pgptStatus(provider: PgptProvider) {
  return { configured: Boolean(key()), modelOrder: pgptModels(provider), baseUrl: pgptBaseUrl(provider), lastCall: lastCalls[provider] || null };
}
export function reviewAiError(error: unknown): string {
  let message = error instanceof Error ? error.message : String(error);
  for (const name of ['PGPT_API_KEY', 'GEMINI_API_KEY', 'NVIDIA_API_KEY']) {
    const secret = process.env[name];
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message.slice(0, 800);
}
export function reviewAiHttpStatus(error: any): number {
  const message = reviewAiError(error);
  if (/P001/.test(message)) return 401;
  if (/P002/.test(message)) return 403;
  if ([400, 401, 403, 413, 429, 503].includes(Number(error?.status))) return Number(error.status);
  return /429/.test(message) ? 429 : 502;
}
function failure(message: string, status = 502): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
export function validatePgptModel(provider: PgptProvider, model?: unknown): string {
  const models = pgptModels(provider);
  if (model !== undefined && (typeof model !== 'string' || !models.includes(model))) throw failure('서버에 설정되지 않은 AI 모델입니다.', 400);
  if (!models.length) throw failure('서버의 AI 모델 설정이 비어 있습니다.', 503);
  return (model as string | undefined) || models[0];
}
export async function generatePgptJson(provider: PgptProvider, prompt: string, options: JsonOptions = {}) {
  const model = validatePgptModel(provider, options.model);
  const apiKey = key();
  if (!apiKey) throw failure('사내 P-GPT API 키를 설정하세요.', 503);
  const configuredTimeout = Number(process.env.PGPT_TIMEOUT_MS || 120000);
  const timeout = Math.max(1, Math.min(Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 120000, options.deadlineMs ?? 130000));
  try {
    let text: string, responseModel: string;
    if (provider === 'gpt') {
      const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [{ type: 'text', text: prompt }];
      if (options.image) content.unshift({ type: 'image_url', image_url: { url: `data:${options.image.mimeType};base64,${options.image.data}` } });
      const client = new OpenAI({ apiKey, baseURL: pgptBaseUrl(provider), maxRetries: 0, timeout });
      const response = await client.chat.completions.create({ model, messages: [{ role: 'user', content }], response_format: { type: 'json_object' }, max_completion_tokens: 16384 });
      const choice = response.choices[0];
      if (choice?.message.refusal) throw failure('GPT가 요청에 대한 응답을 거절했습니다.');
      if (choice?.finish_reason !== 'stop') throw failure('GPT 응답이 완료되지 않았습니다 (' + (choice?.finish_reason || '응답 없음') + ').');
      text = choice.message.content || ''; responseModel = response.model;
    } else {
      // P-GPT's native Claude route requires content blocks, including for text-only requests.
      const content: Anthropic.ContentBlockParam[] = [{ type: 'text', text: prompt }];
      if (options.image) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(options.image.mimeType)) throw failure('지원하지 않는 이미지 형식입니다.', 400);
        content.unshift({ type: 'image', source: { type: 'base64', media_type: options.image.mimeType as 'image/png' | 'image/jpeg' | 'image/webp', data: options.image.data } });
      }
      const client = new Anthropic({ apiKey, baseURL: pgptBaseUrl(provider), maxRetries: 0, timeout, defaultHeaders: { 'x-api-key': apiKey, Authorization: null } });
      const response = await client.messages.create({ model, max_tokens: 16384, messages: [{ role: 'user', content }] });
      if (response.stop_reason !== 'end_turn') throw failure('Claude 응답이 완료되지 않았습니다 (' + response.stop_reason + ').');
      text = response.content.filter(block => block.type === 'text').map(block => block.text).join('\n'); responseModel = response.model;
    }
    const data = parseModelJson(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw failure('AI 응답이 JSON 객체가 아닙니다.');
    lastCalls[provider] = { success: true, at: new Date().toISOString(), model, responseModel };
    return { data, model, responseModel };
  } catch (error: any) {
    const detail = reviewAiError(error);
    lastCalls[provider] = { success: false, at: new Date().toISOString(), model, error: detail };
    // No automatic cross-model retries: preserve permissions, selected model and cost expectations.
    throw failure(detail, Number(error?.status) || 502);
  }
}
