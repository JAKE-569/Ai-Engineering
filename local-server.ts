// Local server: runs the same API functions Vercel deploys (everything under
// api/) plus the React frontend, from one command. Keys come from .env.local
// or .env in the project folder; neither file is committed.
import './local-env';

const { localPort: PORT, serverIdentity, openLocalBrowser, reuseLocalServer } = await import('./local-server-control');
if (await reuseLocalServer()) process.exit(0);

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

const isProduction = process.argv.includes('--prod');
const rootDir = process.cwd();
const apiDir = path.join(rootDir, 'api');

const { createReviewRouter } = await import('./local-review-store');
const app = express();
app.get('/api/local/server-info', (_req, res) => res.json(serverIdentity));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/api/local/reviews', createReviewRouter(path.join(rootDir, 'local-data')));

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

const server = app.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}/`;
  console.log('');
  console.log(`  AI Engineering 로컬 서버 실행 중: ${url}`);
  console.log(`  API: ${routes.join(', ')}`);
  console.log(`  Windows 인증서 사용: ${network.systemCa}   프록시: ${network.proxy || '없음'}`);
  if (missingKeys.length) console.log(`  [주의] .env에 아직 없는 키: ${missingKeys.join(', ')}`);
  console.log('  종료하려면 이 창에서 Ctrl + C 를 누르세요.');
  console.log('');
  void openLocalBrowser();
});
server.on('error', async (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    if (await reuseLocalServer()) process.exit(0);
    console.error(`포트 ${PORT}번을 다른 프로그램 또는 다른 폴더의 서버가 사용 중입니다. 해당 실행 창을 확인하거나 .env.local의 PORT를 변경하세요.`);
  } else {
    console.error('서버 시작 오류:', error);
  }
  process.exit(1);
});
