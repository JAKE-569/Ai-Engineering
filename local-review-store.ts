import express from 'express';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { removeRetiredCrossReview } from './src/lib/retiredCrossReview';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const assetName = /^[0-9a-f-]{36}\.(pdf|png|jpg|webp)$/i;
const mimeTypes: Record<string, string> = { 'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const lockCodes = new Set(['EPERM', 'EBUSY', 'EACCES']);
async function retryFileOperation(operation: () => Promise<void>) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error: any) {
      if (!lockCodes.has(error.code) || attempt === 4) throw error;
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
}
export function createReviewRouter(storageRoot: string) {
  const router = express.Router();
  const root = path.resolve(storageRoot);
  const directory = (id: string) => {
    if (!uuid.test(id)) throw Object.assign(new Error('Invalid document ID'), { status: 400 });
    const dir = path.resolve(root, id);
    if (!dir.startsWith(root + path.sep)) throw new Error('Invalid storage path');
    return dir;
  };
  const atomicJson = async (file: string, data: unknown) => {
    const temp = `${file}.${randomUUID()}.tmp`;
    try { await fs.writeFile(temp, JSON.stringify(data), { flag: 'wx' }); await retryFileOperation(() => fs.rename(temp, file)); }
    finally { await retryFileOperation(() => fs.rm(temp, { force: true })).catch(error => console.warn('[local-store] temporary file cleanup:', error.code)); }
  };
  const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).catch(next);
  router.use((req, res, next) => {
    // Local files are not a public network file server.
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ error: '다른 사이트에서는 로컬 저장소에 접근할 수 없습니다.' });
    next();
  });
  router.get('/', wrap(async (_req: any, res: any) => {
    await fs.mkdir(root, { recursive: true });
    const entries = await fs.readdir(root, { withFileTypes: true });
    const records = []; const errors = [];
    for (const entry of entries.filter(x => x.isDirectory() && uuid.test(x.name))) {
      try {
        const record = JSON.parse(await fs.readFile(path.join(directory(entry.name), 'review.json'), 'utf8'));
        if (record.bundle) records.push(removeRetiredCrossReview(record));
      } catch (error: any) { if (error.code !== 'ENOENT') errors.push(`${entry.name}: 저장 결과를 읽을 수 없습니다.`); }
    }
    records.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || a.id.localeCompare(b.id));
    res.json({ records, errors });
  }));
  router.post('/', wrap(async (_req: any, res: any) => {
    const id = randomUUID(); await fs.mkdir(path.join(directory(id), 'assets'), { recursive: true });
    res.status(201).json({ id });
  }));
  router.post('/:id/assets', express.raw({ type: '*/*', limit: '50mb' }), wrap(async (req: any, res: any) => {
    const dir = directory(req.params.id);
    const ext = mimeTypes[req.headers['content-type']?.split(';')[0]];
    if (!ext || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'PDF, PNG, JPEG, WebP 파일이 필요합니다.' });
    const name = `${randomUUID()}.${ext}`;
    const dest = path.join(dir, 'assets', name); const temp = `${dest}.tmp`;
    try { await fs.writeFile(temp, req.body, { flag: 'wx' }); await retryFileOperation(() => fs.rename(temp, dest)); }
    finally { await retryFileOperation(() => fs.rm(temp, { force: true })).catch(error => console.warn('[local-store] temporary file cleanup:', error.code)); }
    res.status(201).json({ url: `/api/local/reviews/${req.params.id}/assets/${name}` });
  }));
  router.get('/:id/assets/:name', wrap(async (req: any, res: any) => {
    const dir = directory(req.params.id);
    if (!assetName.test(req.params.name)) return res.status(400).json({ error: 'Invalid asset ID' });
    const file = path.join(dir, 'assets', req.params.name);
    await fs.access(file);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(file);
  }));
  router.get('/:id', wrap(async (req: any, res: any) => {
    res.json(removeRetiredCrossReview(JSON.parse(await fs.readFile(path.join(directory(req.params.id), 'review.json'), 'utf8'))));
  }));
  router.put('/:id', wrap(async (req: any, res: any) => {
    const dir = directory(req.params.id); const bundle = removeRetiredCrossReview(req.body);
    if (!bundle?.uploadFile || !bundle?.reviewItem || bundle.uploadFile.documentId !== req.params.id || bundle.reviewItem.documentId !== req.params.id || !['designErrors', 'safetyItems', 'veItems'].every(k => Array.isArray(bundle[k]))) {
      return res.status(400).json({ error: '검토 결과 형식이 올바르지 않습니다.' });
    }
    const serialized = JSON.stringify(bundle);
    if (serialized.includes('data:')) return res.status(400).json({ error: '원본과 이미지는 파일 업로드 API를 사용하세요.' });
    const record = { schemaVersion: 1, id: req.params.id, updatedAt: new Date().toISOString(), bundle };
    await atomicJson(path.join(dir, 'review.json'), record);
    res.json(record);
  }));
  router.delete('/:id', wrap(async (req: any, res: any) => {
    const dir = directory(req.params.id);
    // Move out of the visible collection before removal. The path is checked above.
    const trash = path.join(root, `.deleted-${req.params.id}-${randomUUID()}`);
    await retryFileOperation(() => fs.rename(dir, trash));
    await fs.rm(trash, { recursive: true, force: true, maxRetries: 4, retryDelay: 150 });
    res.status(204).end();
  }));
  router.use((error: any, req: any, res: any, _next: any) => {
    const status = error.status || (error.code === 'ENOENT' ? 404 : lockCodes.has(error.code) ? 423 : 500);
    const operation = req.method === 'DELETE' ? '삭제' : req.method === 'GET' ? '불러오기' : '저장';
    console.error('[local-store]', { method: req.method, path: req.path, code: error.code, syscall: error.syscall });
    res.status(status).json({
      error: status === 413 ? '파일당 최대 크기는 50MB입니다.' : status === 404 ? '저장된 파일이 없습니다.' :
        status === 423 ? '파일 또는 폴더가 사용 중이거나 접근 권한이 없습니다. 열려 있는 파일을 닫고 잠시 후 다시 시도하세요.' : '로컬 저장소 작업에 실패했습니다.',
      operation, detail: error.code || error.message,
    });
  });
  return router;
}
