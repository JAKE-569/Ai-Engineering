import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { generatePgptJson, pgptStatus, reviewAiError } from '../src/services/pgptService';
import review from '../api/gemini/review-drawing';
import synthesize from '../api/gemini/synthesize-review';
import estimate from '../api/gemini/estimate-ve';

test('GPT and Claude use their native SDK routes, credentials, selected models and complete JSON only', async () => {
  const before = { ...process.env };
  const app = express(); app.use(express.json({ limit: '50mb' }));
  const calls: { path: string; body: any; headers: any }[] = [];
  let mode = 'ok';
  app.post(['/v1/chat/completions', '/v1/messages'], (req, res) => {
    calls.push({ path: req.path, body: req.body, headers: req.headers });
    if (mode === 'permission') return res.status(403).json({ error: { message: 'P002 test-key', type: 'permission_error' } });
    if (mode === 'quota') return res.status(429).json({ error: { message: 'quota', type: 'rate_limit_error' } });
    if (mode === 'timeout') return;
    const text = mode === 'json' ? '{bad}' : mode === 'array' ? '[]' : '{"summary":"연결 확인"}';
    if (req.path.endsWith('/messages')) return res.json({ id: 'msg_test', type: 'message', role: 'assistant', model: req.body.model, content: [{ type: 'text', text: '```json\n' + text + '\n```' }], stop_reason: mode === 'length' ? 'max_tokens' : 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } });
    return res.json({ id: 'chat_test', object: 'chat.completion', model: req.body.model + '-version', choices: [{ index: 0, finish_reason: mode === 'length' ? 'length' : 'stop', message: { role: 'assistant', content: text, ...(mode === 'refusal' ? { refusal: 'declined' } : {}) } }] });
  });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    process.env.GEMINI_API_KEY = 'test-key'; delete process.env.PGPT_API_KEY;
    process.env.PGPT_GPT_BASE_URL = url + '/v1'; process.env.PGPT_CLAUDE_BASE_URL = url;
    process.env.PGPT_GPT_MODELS = 'gpt-first,gpt-selected'; process.env.PGPT_CLAUDE_MODELS = 'claude-selected';
    for (const provider of ['gpt', 'claude'] as const) {
      mode = 'ok';
      const result = await generatePgptJson(provider, 'Return JSON', { model: provider + '-selected', image: { mimeType: 'image/png', data: 'test-base64' } });
      assert.equal(result.data.summary, '연결 확인'); assert.equal(result.model, provider + '-selected');
      const call = calls.at(-1)!;
      assert.equal(call.body.model, provider + '-selected');
      if (provider === 'gpt') {
        assert.equal(call.headers.authorization, 'Bearer test-key'); assert.equal(call.headers['x-api-key'], undefined);
        assert.equal(call.body.messages[0].content[0].image_url.url, 'data:image/png;base64,test-base64');
        assert.equal(result.responseModel, 'gpt-selected-version');
      } else {
        assert.equal(call.headers['x-api-key'], 'test-key'); assert.equal(call.headers.authorization, undefined);
        assert.equal(call.body.messages[0].content[0].source.data, 'test-base64');
      }
      await generatePgptJson(provider, 'Text-only JSON');
      assert.equal(calls.at(-1)!.body.messages[0].content[0].type, 'text');
      for (const failing of ['permission', 'quota', 'length', 'json', 'array']) {
        mode = failing; const count = calls.length;
        await assert.rejects(generatePgptJson(provider, 'Return JSON'), error => !String(error).includes('test-key'));
        assert.equal(calls.length, count + 1, 'Do not silently retry or switch models');
        assert.equal(pgptStatus(provider).lastCall?.success, false);
      }
      mode = 'ok'; const count = calls.length;
      await assert.rejects(generatePgptJson(provider, 'Return JSON', { model: 'not-allowed' }), /설정되지/);
      await assert.rejects(generatePgptJson(provider, 'Return JSON', { model: {} as any }), /설정되지/);
      assert.equal(calls.length, count);
    }
    mode = 'refusal'; await assert.rejects(generatePgptJson('gpt', 'JSON'), /거절/);
    mode = 'timeout'; await assert.rejects(generatePgptJson('gpt', 'JSON', { deadlineMs: 25 }), /timed out/i);
    assert.equal(reviewAiError(new Error('test-key')), '[REDACTED]');
    delete process.env.GEMINI_API_KEY;
    await assert.rejects(generatePgptJson('claude', 'JSON'), /키/);
  } finally { process.env = before; server.closeAllConnections(); server.close(); }
});

test('both providers route drawing, synthesis and VE through selected model and preserve failures', async () => {
  const before = { ...process.env };
  const app = express(); app.use(express.json({ limit: '50mb' }));
  const seen: { model: string; prompt: string }[] = [];
  let denied = false;
  app.post(['/v1/chat/completions', '/v1/messages'], (req, res) => {
    if (denied) return res.status(403).json({ error: { message: 'P002', type: 'permission_error' } });
    const prompt = req.body.messages[0].content.find((part: any) => part.type === 'text').text;
    seen.push({ model: req.body.model, prompt });
    const data = prompt.includes('VE_ASSUMPTION_ESTIMATE') ? { calculationBasis: '시험 가정', costEstimate: { basisType: 'llm-assumption', currency: 'KRW', scope: '1개소 가정', vatBasis: '별도', lines: [{ label: '작업', unit: '개', beforeQuantity: 1, afterQuantity: 1, beforeUnitPrice: 100, afterUnitPrice: 80, quantitySource: '1개 가정', unitPriceSource: '단가 가정' }], additionalCost: 0, additionalCostBasis: '추가비용 없음 가정', assumptions: ['시험 가정'], missingInputs: ['실제 견적'] } } : { summary: '근거 확인 필요', designItems: [{ title: '단면 확인', description: '단면 확인 필요', status: 'NEEDS_CONFIRMATION', evidence: '수치 미확인' }], safetyItems: [], veItems: [] };
    const text = JSON.stringify(data);
    if (req.path.endsWith('/messages')) return res.json({ id: 'msg_test', type: 'message', role: 'assistant', model: req.body.model, content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } });
    return res.json({ id: 'chat_test', object: 'chat.completion', model: req.body.model, choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: text } }] });
  });
  app.post('/review', (req, res) => review(req as any, res as any));
  app.post('/summary', (req, res) => synthesize(req as any, res as any));
  app.post('/estimate', (req, res) => estimate(req as any, res as any));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const post = (route: string, body: object) => fetch(url + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    process.env.PGPT_API_KEY = 'test-key'; process.env.PGPT_GPT_BASE_URL = url + '/v1'; process.env.PGPT_CLAUDE_BASE_URL = url;
    process.env.PGPT_GPT_MODELS = 'gpt-test'; process.env.PGPT_CLAUDE_MODELS = 'claude-test';
    process.env.GOOGLE_CLOUD_VISION_API_KEY = ''; process.env.GOOGLE_CLOUD_VISION_USE_ADC = '';
    for (const provider of ['gpt', 'claude']) {
      const base = { provider, model: provider + '-test' };
      const input = { ...base, fileName: 'test.png', mimeType: 'image/png', base64Data: 'test', pageNumber: 1, totalPages: 1 };
      const response = await post('/review', input); assert.equal(response.status, 200);
      const result = await response.json(); assert.equal(result.data.engine.provider, provider); assert.equal(result.model, base.model); assert.ok(!result.data.partial);
      assert.equal(result.data.designItems[0].status, 'NEEDS_CONFIRMATION');
      const summary = await post('/summary', { ...base, fileName: 'test.pdf', totalPages: 2, failedPages: [{ pageNumber: 2, reason: 'missing' }], pageResults: { pages: [{ pageNumber: 1, summary: '근거' }] } });
      assert.equal(summary.status, 200); assert.equal((await summary.json()).data.reviewSummary.description, '근거 확인 필요');
      const estimateResult = await post('/estimate', { ...base, item: { description: '작업 개선' } }); assert.equal(estimateResult.status, 200);
      assert.equal((await estimateResult.json()).data.costEstimate.generatedBy, base.model);
      denied = true;
      assert.equal((await post('/review', input)).status, 403);
      assert.equal((await post('/summary', { ...base, fileName: 'test.pdf', totalPages: 2, pageResults: {} })).status, 403);
      assert.equal((await post('/estimate', { ...base, item: { description: '작업 개선' } })).status, 403);
      denied = false;
      assert.equal((await post('/review', { ...input, model: 'not-allowed' })).status, 400);
      assert.equal((await post('/estimate', { ...base, model: 'not-allowed', item: { description: '작업 개선' } })).status, 400);
    }
    assert.ok(seen.some(call => call.prompt.includes('실패 페이지') && call.prompt.includes('missing')));
    assert.ok(seen.every(call => ['gpt-test', 'claude-test'].includes(call.model)));
  } finally { process.env = before; server.closeAllConnections(); server.close(); }
});
