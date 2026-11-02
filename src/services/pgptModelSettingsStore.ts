import { readFileSync, mkdirSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PgptModelSettings } from '../lib/pgptModelSettings.js';

const settingsPath = () => process.env.PGPT_SETTINGS_FILE || path.resolve('local-data', 'ai-model-settings.json');
export function validateModelSettings(value: any): asserts value is PgptModelSettings {
  for (const provider of ['gpt', 'claude'] as const) {
    const setting = value?.[provider];
    if (!setting || !Array.isArray(setting.models) || !setting.models.length || setting.models.length > 100 || !setting.models.every((id: unknown) => typeof id === 'string' && id.startsWith(provider + '-') && /^[a-zA-Z0-9._:-]{1,150}$/.test(id)) || !setting.models.includes(setting.defaultModel)) {
      throw Object.assign(new Error('모델 목록과 기본 모델 설정을 확인하세요.'), { status: 400 });
    }
  }
}
export function readModelSettings(): PgptModelSettings | undefined {
  try {
    const data = JSON.parse(readFileSync(settingsPath(), 'utf8'));
    validateModelSettings(data);
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') return undefined;
    throw new Error('저장된 AI 모델 설정을 읽을 수 없습니다. local-data/ai-model-settings.json을 확인하세요.');
  }
}
export function saveModelSettings(settings: PgptModelSettings): void {
  validateModelSettings(settings);
  if (process.env.VERCEL) throw Object.assign(new Error('모델 설정 저장은 로컬 서버에서 지원합니다.'), { status: 409 });
  const target = settingsPath();
  mkdirSync(path.dirname(target), { recursive: true });
  const temp = target + '.' + randomUUID() + '.tmp';
  try {
    writeFileSync(temp, JSON.stringify(settings, null, 2), { flag: 'wx', encoding: 'utf8' });
    renameSync(temp, target);
  } finally { rmSync(temp, { force: true }); }
}
