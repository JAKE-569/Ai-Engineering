import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createReviewRouter } from '../local-review-store';
import { sprinklerMeasurements } from '../src/lib/measurements';
import { dummyRulesDb } from '../src/data/dummyRulesDb';
import { normalizeReview, hasCoordinates, parseModelJson } from '../src/lib/reviewNormalization';
import { generateGeminiJson } from '../src/services/geminiService';
import { initSupabase, saveSupabaseConfig, syncInitialDataToSupabase } from '../src/lib/supabaseClient';

test('millimetres are converted and unrelated distances are not sprinkler measurements', () => {
  assert.equal(sprinklerMeasurements('헤드 간격 300 mm')[0].metres, 0.3);
  assert.equal(sprinklerMeasurements('헤드 간격 30 cm')[0].metres, 0.3);
  assert.deepEqual(sprinklerMeasurements('복도 간격 3 m. 스프링클러 헤드 확인 불가'), []);
  const rule = dummyRulesDb.find(x => x.id === 'fire-sprinkler-spacing')!;
  assert.equal(rule.checkCondition('헤드 간격 300 mm').status, 'NEEDS_CONFIRMATION');
  assert.equal(rule.checkCondition('헤드 간격 10 m').status, 'NEEDS_CONFIRMATION');
});
test('normalization preserves uncertain verdicts, item evidence, zero coordinates and page identity', () => {
  const review = normalizeReview({ designItems: [{ status: 'NEEDS_CONFIRMATION', evidence: 'A', xPercent: 0, yPercent: '0', pageNumber: 99 }, { status: 'PASS', evidence: 'B', xPercent: null, yPercent: '' }] }, 2, 3);
  assert.equal(review.designItems[0].findingStatus, 'NEEDS_CONFIRMATION');
  assert.equal(review.designItems[1].findingStatus, 'PASS');
  assert.equal(review.designItems[1].evidence, 'B');
  assert.equal(review.designItems[0].pageNumber, 2);
  assert.equal(hasCoordinates(review.designItems[0]), true);
  assert.equal(hasCoordinates(review.designItems[1]), false);
  assert.equal(review.reviewSummary.status, '주의');
  assert.throws(() => normalizeReview({ designItems: {}, safetyItems: [] }));
  assert.throws(() => normalizeReview({}));
  assert.throws(() => parseModelJson('```json\n{bad}\n```'));
});
async function listen(app: express.Express) {
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${(server.address() as any).port}` };
}
test('P-GPT SDK uses native path, UUID header, image payload and JSON output; permission failure is explicit', async () => {
  const app = express(); app.use(express.json()); const calls: any[] = []; let denied = false;
  app.post('/gpgpta01-gpt/v1beta/models/:action', (req, res) => {
    calls.push({ path: req.path, key: req.header('x-goog-api-key'), body: req.body });
    if (denied) return res.status(403).json({ error: { code: 'P002', message: 'model permission P002' } });
    res.json({ candidates: [{ content: { role: 'model', parts: [{ text: '{"summary":"ok"}' }] }, finishReason: 'STOP' }] });
  });
  const { server, url } = await listen(app);
  const before = { ...process.env };
  try {
    process.env.GEMINI_API_KEY = 'test-uuid-no-real-key'; process.env.GOOGLE_GEMINI_BASE_URL = url + '/gpgpta01-gpt';
    process.env.GEMINI_MODELS = 'gemini-3.5-flash';
    const result = await generateGeminiJson('test', { image: { mimeType: 'image/png', data: 'aGVsbG8=' } });
    assert.equal(result.data.summary, 'ok'); assert.equal(calls[0].key, 'test-uuid-no-real-key');
    assert.match(calls[0].path, /gemini-3.5-flash:generateContent$/);
    assert.equal(calls[0].body.contents[0].parts[0].inlineData.mimeType, 'image/png');
    assert.equal(calls[0].body.generationConfig.responseMimeType, 'application/json');
    denied = true;
    await assert.rejects(generateGeminiJson('test'), /P002/);
    assert.equal(calls.length, 2);
  } finally { process.env = before; server.close(); }
});
test('local store saves separate assets, survives router restart, isolates same names and reports errors', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-test-'));
  const makeApp = () => { const app = express(); app.use(express.json()); app.use('/api/local/reviews', createReviewRouter(root)); return app; };
  let running = await listen(makeApp());
  try {
    const base = () => running.url + '/api/local/reviews';
    const create = async () => (await (await fetch(base(), { method: 'POST' })).json()).id;
    const first = await create(); const second = await create();
    const assetRes = await fetch(`${base()}/${first}/assets`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: Buffer.from('test-image') });
    assert.equal(assetRes.status, 201); const asset = (await assetRes.json()).url;
    const bundle = (id: string) => ({ uploadFile: { id: 'up-' + id, documentId: id, name: 'same.png' }, reviewItem: { id: 'rev-' + id, documentId: id, fileName: 'same.png', execution: { state: 'partial', failedPages: [{ pageNumber: 2, reason: 'test' }] } }, designErrors: [], safetyItems: [], veItems: [] });
    for (const id of [first, second]) assert.equal((await fetch(`${base()}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...bundle(id), ...(id === first ? { source: asset } : {}) }) })).status, 200);
    running.server.close(); await once(running.server, 'close'); running = await listen(makeApp());
    const records = await (await fetch(base())).json(); assert.equal(records.records.length, 2);
    assert.equal(await (await fetch(running.url + asset)).text(), 'test-image');
    assert.equal((await fetch(`${base()}/${first}`, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(`${base()}/${second}`)).status, 200);
    assert.equal((await fetch(`${base()}/not-a-uuid`, { method: 'DELETE' })).status, 400);
    assert.equal((await fetch(base(), { headers: { Origin: 'http://unrelated.example' } })).status, 403);
    assert.equal((await fetch(`${base()}/${first}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bundle(first)) })).status, 404);
    assert.equal((await fetch(`${base()}/${second}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 400);
  } finally { running.server.close(); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true }); }
});

test('Supabase permission errors are returned as failed saves', async () => {
  const app = express(); app.post('/rest/v1/review_items', (_req, res) => res.status(403).json({ code: '42501', message: 'permission denied' }));
  const { server, url } = await listen(app);
  const originalError = console.error;
  try {
    saveSupabaseConfig(url, 'test-anon-key'); initSupabase(url, 'test-anon-key');
    console.error = () => {};
    assert.equal(await syncInitialDataToSupabase([], [], [], [], []), false);
  } finally { console.error = originalError; saveSupabaseConfig('', ''); server.close(); }
});
test('local store retries temporary Windows locks and preserves records when deletion stays locked', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-eng-lock-test-'));
  const app = express(); app.use(express.json()); app.use('/api/local/reviews', createReviewRouter(root));
  const running = await listen(app); const base = running.url + '/api/local/reviews';
  try {
    const id = (await (await fetch(base, { method: 'POST' })).json()).id;
    const bundle = { uploadFile: { id: 'up', documentId: id }, reviewItem: { id: 'rev', documentId: id }, designErrors: [], safetyItems: [], veItems: [] };
    const rename = fs.rename.bind(fs); let calls = 0;
    const transient = t.mock.method(fs, 'rename', async (from: any, to: any) => {
      if (++calls <= 2) throw Object.assign(new Error('busy'), { code: 'EPERM', syscall: 'rename' });
      return rename(from, to);
    });
    const saved = await fetch(base + '/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bundle) });
    assert.equal(saved.status, 200); assert.equal(calls, 3); transient.mock.restore();
    const locked = t.mock.method(fs, 'rename', async () => { throw Object.assign(new Error('busy'), { code: 'EPERM', syscall: 'rename' }); });
    const failed = await fetch(base + '/' + id, { method: 'DELETE' });
    assert.equal(failed.status, 423); const error = await failed.json();
    assert.equal(error.operation, '삭제'); assert.equal(error.detail, 'EPERM');
    assert.equal((await fetch(base + '/' + id)).status, 200);
    assert.equal((await (await fetch(base)).json()).records.length, 1);
    locked.mock.restore();
    assert.equal((await fetch(base + '/' + id, { method: 'DELETE' })).status, 204);
  } finally {
    t.mock.restoreAll(); running.server.close();
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('client reports a deletion failure as deletion and translates old EPERM responses', async (t) => {
  const { deleteLocalReview } = await import('../src/lib/localReviewClient');
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ error: '로컬 저장소 작업 실패', detail: 'EPERM' }), { status: 500 }));
  await assert.rejects(deleteLocalReview('test-document'), error => {
    assert.match((error as Error).message, /로컬 삭제 실패/);
    assert.match((error as Error).message, /EPERM/);
    assert.doesNotMatch((error as Error).message, /\{"error"/);
    return true;
  });
});

