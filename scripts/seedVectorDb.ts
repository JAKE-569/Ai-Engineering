import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: false });
import { nvidiaModels, nvidiaRequest } from '../src/config/nvidia';
import { vectorDbConfig } from '../src/config/vectorDb';
import fullFireRulesDb from '../src/data/fireRulesFullDb.json';
import fullTradeRulesDb from '../src/data/tradeRulesFullDb.json';

const CHUNK_SIZE = 450;
const CHUNK_OVERLAP = 80;

function chunkClause(clause: any) {
  const code = String(clause.code || '').trim();
  const title = String(clause.clause || '').trim();
  const body = String(clause.text || '').replace(/\s+/g, ' ').trim();
  const header = `[법규코드] ${code}\n[조문제목] ${title}`.trim();
  if (!body) return [{ code, clause: title, content: header, trade: clause.trade || '공통', source_url: clause.sourceUrl, publisher: clause.publisher }];

  const parts: string[] = [];
  let cursor = 0;
  while (cursor < body.length) {
    const end = Math.min(cursor + CHUNK_SIZE, body.length);
    const part = body.slice(cursor, end).trim();
    if (part) parts.push(`${header}\n[조문본문]\n${part}`);
    if (end >= body.length) break;
    cursor = Math.max(end - CHUNK_OVERLAP, cursor + 1);
  }
  return parts.map((content) => ({ code, clause: title, content, trade: clause.trade || '공통', source_url: clause.sourceUrl, publisher: clause.publisher }));
}

const chunks = [...(fullFireRulesDb as any).clauses, ...(fullTradeRulesDb as any).clauses].flatMap(chunkClause);

async function main() {
  if (!vectorDbConfig.url || !vectorDbConfig.serviceRoleKey) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  const rows: any[] = [];
  for (let offset = 0; offset < chunks.length; offset += 256) {
    const batch = chunks.slice(offset, offset + 256);
    const vectors = await nvidiaRequest('/embeddings', { model: nvidiaModels.embedding, input: batch.map((chunk) => chunk.content), input_type: 'passage' });
    rows.push(...batch.map((chunk, index) => ({ ...chunk, embedding: vectors.data[index].embedding })));
    console.log(`Embedded ${Math.min(offset + batch.length, chunks.length)}/${chunks.length} rule chunks`);
  }
  const headers = { 'Content-Type': 'application/json', apikey: vectorDbConfig.serviceRoleKey, Authorization: `Bearer ${vectorDbConfig.serviceRoleKey}`, Prefer: 'return=minimal' };
  for (let offset = 0; offset < rows.length; offset += 50) {
    const batch = rows.slice(offset, offset + 50);
    let response: Response | undefined;
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      response = await fetch(`${vectorDbConfig.url}/rest/v1/${vectorDbConfig.collection}`, { method: 'POST', headers, body: JSON.stringify(batch) });
      if (response.ok) break;
      lastError = await response.text();
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
    if (!response?.ok) throw new Error(`Supabase batch ${offset + 1}-${offset + batch.length} failed: ${lastError}`);
    console.log(`Stored ${Math.min(offset + batch.length, rows.length)}/${rows.length} rule chunks`);
  }
  console.log(`Seeded ${rows.length} Korean legal and engineering rule chunks into Supabase ${vectorDbConfig.collection}`);
}
main().catch((error) => { console.error(error); process.exit(1); });
