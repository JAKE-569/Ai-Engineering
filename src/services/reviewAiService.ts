import { generateGeminiJson } from './geminiService.js';
import { generatePgptJson, type JsonOptions } from './pgptService.js';
export { reviewAiError, reviewAiHttpStatus } from './pgptService.js';
export type DirectReviewProvider = 'gemini' | 'gpt' | 'claude';
export const isDirectReviewProvider = (value: unknown): value is DirectReviewProvider => ['gemini', 'gpt', 'claude'].includes(value as string);
export function generateReviewJson(provider: DirectReviewProvider, prompt: string, options: JsonOptions = {}) {
  return provider === 'gemini' ? generateGeminiJson(prompt, options) : generatePgptJson(provider, prompt, options);
}
