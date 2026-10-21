// Local server: runs the same API functions Vercel deploys (everything under
// api/) plus the React frontend, from one command. Keys come from .env.local
// or .env in the project folder; neither file is committed.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Trust the Windows certificate store and honour HTTPS_PROXY before any API
// module makes a request.
const { setupLocalNetwork } = await import('./local-network');
const network = await setupLocalNetwork();

// The API modules read process.env at import time, so load them only after
// the .env files above have been applied.
const { default: express } = await import('express');
const path = await import('node:path');
const fs = await import('node:fs');
const { pathToFileURL } = await import('node:url');
const { exec } = await import('node:child_process');

const isProduction = process.argv.includes('--prod');
const PORT = Number(process.env.PORT || 3000);
const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'api');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mirror Vercel's file-based routing: api/gemini/review-drawing.ts serves
// /api/gemini/review-drawing.
function findApiFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return findApiFiles(fullPath);
    return /\.(ts|js|mjs)$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [fullPath] : [];
  });
}

const routes: string[] = [];
for (const file of findApiFiles(apiDir)) {
  const route = '/api/' + path.relative(apiDir, file).replace(/\\/g, '/').replace(/\.(ts|js|mjs)$/, '').replace(/\/index$/, '');
  const mod = await import(pathToFileURL(file).href);
  if (typeof mod.default !== 'function') continue;
  app.all(route, async (req, res) => {
    try {
      await mod.default(req, res);
    } catch (error: any) {
      console.error(`[${route}]`, error);
      if (!res.headersSent) res.status(500).json({ error: 'Local API error', detail: error?.message || 'unknown error' });
    }
  });
  routes.push(route);
}
app.all('/api/*', (req, res) => res.status(404).json({ error: `No API route for ${req.path}` }));

if (isProduction) {
  const distPath = path.join(rootDir, 'dist');
  if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error('dist 폴더가 없습니다. 먼저 "npm run build"를 실행하세요.');
    process.exit(1);
  }
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const missingKeys = ['GEMINI_API_KEY', 'NVIDIA_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter((key) => !process.env[key]);

const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}/`;
  console.log('');
  console.log(`  AI Engineering 로컬 서버 실행 중: ${url}`);
  console.log(`  API: ${routes.join(', ')}`);
  console.log(`  Windows 인증서 사용: ${network.systemCa}   프록시: ${network.proxy || '없음'}`);
  if (missingKeys.length) console.log(`  [주의] .env에 아직 없는 키: ${missingKeys.join(', ')}`);
  console.log('  종료하려면 이 창에서 Ctrl + C 를 누르세요.');
  console.log('');
  if (process.env.OPEN_BROWSER !== 'false') {
    const command = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
    exec(command, () => undefined);
  }
});
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`포트 ${PORT}번이 이미 사용 중입니다. 이미 켜진 서버 창을 닫거나 http://localhost:${PORT}/ 를 그대로 사용하세요.`);
  } else {
    console.error('서버 시작 오류:', error);
  }
  process.exit(1);
});
