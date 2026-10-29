import { GoogleGenAI } from '@google/genai';
import { parseModelJson } from '../lib/reviewNormalization.js';

let lastCall: { success: boolean; at: string; model?: string; error?: string } | null = null;
export const geminiConnectionStatus = () => lastCall;
export const DEFAULT_PGPT_URL = 'http://aigpt.posco.net/gpgpta01-gpt';
export const geminiBaseUrl = () => (process.env.GOOGLE_GEMINI_BASE_URL || DEFAULT_PGPT_URL).replace(/\/+$/, '');
export function geminiModels(uiModel?: string): string[] {
  const split = (s?: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);
  const configured = split(process.env.GEMINI_MODELS);
  return [...new Set(configured.length ? configured : [uiModel || process.env.GEMINI_MODEL || 'gemini-3.5-flash', ...split(process.env.GEMINI_FALLBACK_MODELS || 'gemini-3-flash-preview,gemini-3.1-flash-lite')])];
}
export function createGeminiClient() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY에 사내 P-GPT UUID 키를 설정하세요.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, vertexai: false, httpOptions: { baseUrl: geminiBaseUrl(), apiVersion: 'v1beta' } });
}
export function geminiError(error: any): string {
  let message = String(error?.message || error);
  if (/P001|401/.test(message)) message = 'P-GPT 인증 실패(P001): 사내 UUID API Key를 확인하세요.';
  else if (/P002/.test(message)) message = 'P-GPT 모델 권한 오류(P002): 관리자 화면의 API 모델 활성화를 확인하세요.';
  else if (/403/.test(message)) message = 'P-GPT 접근 권한이 없습니다(403).';
  else if (/429/.test(message)) message = 'P-GPT 사용량 제한(429): 잠시 후 다시 시도하세요.';
  const key = process.env.GEMINI_API_KEY;
  return (key ? message.split(key).join('[REDACTED]') : message).slice(0, 800);
}
export async function generateGeminiJson(prompt: string, options: { model?: string; image?: { mimeType: string; data: string }; deadlineMs?: number } = {}) {
  const ai = createGeminiClient();
  const deadline = Date.now() + (options.deadlineMs ?? 130000);
  let last: unknown;
  for (const model of geminiModels(options.model)) {
    if (Date.now() >= deadline) break;
    try {
      const parts: any[] = [{ text: prompt }];
      if (options.image) parts.unshift({ inlineData: options.image });
      const response = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config: {
        responseMimeType: 'application/json', temperature: 0.15,
        httpOptions: { timeout: Math.min(Number(process.env.GEMINI_TIMEOUT_MS || 60000), deadline - Date.now()) },
      } });
      const data = parseModelJson(response.text || '');
      lastCall = { success: true, at: new Date().toISOString(), model };
      return { data, model };
    } catch (error: any) {
      last = error;
      lastCall = { success: false, at: new Date().toISOString(), model, error: geminiError(error) };
      const message = String(error?.message || '');
      // Authentication/permission errors must not be disguised by model retries.
      if (/P001|P002/.test(message) || [401, 403].includes(Number(error?.status))) throw new Error(geminiError(error));
      if (![404, 429, 500, 502, 503, 504].includes(Number(error?.status))) throw new Error(geminiError(error));
    }
  }
  throw new Error(geminiError(last || 'P-GPT 요청 시간이 초과되었습니다.'));
}
