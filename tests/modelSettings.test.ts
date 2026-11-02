import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import models from '../api/pgpt/models';
import { pgptModels, validatePgptModel } from '../src/services/pgptService';

test('model settings discover, validate and atomically persist defaults across a fresh process', async () => {
  const before = { ...process.env };
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-model-settings-'));
  const file = path.join(root, 'settings.json');
  const app = express(); app.use(express.json()); let unavailable = false; let calls = 0;
  app.get('/v1/models', (req, res) => {
    assert.equal(req.headers.authorization, 'Bearer test-model-key'); calls++;
    if (unavailable) return res.status(503).json({ error: { message: 'offline', type: 'server_error' } });
    res.json({ object: 'list', data: ['gpt-5.4', 'gpt-5.4-mini', 'claude-sonnet-4.6', 'claude-opus-4.7', 'gemini-3.5-flash', 'gpt-5.4'].map(id => ({ id, object: 'model' })) });
  });
  app.all('/api/pgpt/models', (req, res) => models(req as any, res as any));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as any).port}`;
  const put = (body: any, origin?: string) => fetch(url + '/api/pgpt/models', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify(body) });
  try {
    process.env.PGPT_API_KEY = 'test-model-key'; process.env.PGPT_GPT_BASE_URL = url + '/v1'; process.env.PGPT_SETTINGS_FILE = file;
    process.env.PGPT_GPT_MODELS = 'gpt-5.4'; process.env.PGPT_CLAUDE_MODELS = 'claude-sonnet-4.6'; delete process.env.VERCEL;
    const response = await fetch(url + '/api/pgpt/models'); assert.equal(response.status, 200);
    const initial = await response.json();
    assert.deepEqual(initial.available.gpt, ['gpt-5.4', 'gpt-5.4-mini']);
    assert.equal(initial.settings.claude.defaultModel, 'claude-sonnet-4.6');
    await assert.rejects(fs.access(file), /ENOENT/); // Fetching the catalog does not save settings.
    const selected = { gpt: 'gpt-5.4-mini', claude: 'claude-opus-4.7' };
    assert.equal((await put(selected, 'https://unrelated.example')).status, 403);
    assert.equal((await put(selected, 'broken origin')).status, 403);
    assert.equal((await put({ ...selected, gpt: 'gpt-made-up' })).status, 400);
    assert.equal((await put({ gpt: [] })).status, 400);
    assert.equal((await put(selected)).status, 200);
    const saved = await fs.readFile(file, 'utf8');
    assert.ok(!saved.includes('test-model-key'));
    assert.equal(pgptModels('gpt')[0], selected.gpt);
    assert.equal(validatePgptModel('claude'), selected.claude);
    assert.equal(validatePgptModel('gpt', 'gpt-5.4'), 'gpt-5.4'); // Existing queued documents retain their model.
    const restarted = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', "import {pgptModels} from './src/services/pgptService.ts'; process.stdout.write(JSON.stringify(pgptModels('gpt')));"], { env: process.env, encoding: 'utf8' });
    assert.equal(JSON.parse(restarted)[0], selected.gpt);
    unavailable = true;
    assert.equal((await put({ gpt: 'gpt-5.4', claude: 'claude-sonnet-4.6' })).status, 503);
    assert.equal(await fs.readFile(file, 'utf8'), saved);
    assert.equal(validatePgptModel('gpt'), selected.gpt);
    unavailable = false;
    process.env.PGPT_SETTINGS_FILE = root; // A directory cannot replace a settings file.
    assert.equal((await put(selected)).status, 502);
    assert.equal(await fs.readFile(file, 'utf8'), saved);
    assert.ok(calls >= 3);
  } finally { process.env = before; server.closeAllConnections(); server.close(); assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(root, { recursive: true, force: true }); }
});
