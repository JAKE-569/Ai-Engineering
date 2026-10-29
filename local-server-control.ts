import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { exec } from 'node:child_process';

export const localPort = Number(process.env.PORT || 3000);
if (!Number.isInteger(localPort) || localPort < 1 || localPort > 65535) throw new Error('PORT는 1~65535 사이의 정수여야 합니다.');
const root = realpathSync(process.cwd());
export const serverIdentity = {
  app: 'ai-design-review-agent',
  workspace: createHash('sha256').update(process.platform === 'win32' ? root.toLowerCase() : root).digest('hex'),
  pid: process.pid,
};
export async function findLocalServer(): Promise<typeof serverIdentity | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${localPort}/api/local/server-info`, { signal: AbortSignal.timeout(2500) });
    if (!response.ok) return null;
    const info = await response.json();
    return info.app === serverIdentity.app && info.workspace === serverIdentity.workspace && Number.isInteger(info.pid) && info.pid > 0 ? info : null;
  } catch { return null; }
}
export async function openLocalBrowser() {
  if (process.env.OPEN_BROWSER === 'false') return;
  const url = `http://localhost:${localPort}/`;
  const command = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  await new Promise<void>(resolve => exec(command, () => resolve()));
}
export async function reuseLocalServer() {
  if (!await findLocalServer()) return false;
  console.log(`이미 실행 중인 AI설계검토Agent에 접속합니다: http://localhost:${localPort}/`);
  await openLocalBrowser();
  return true;
}
