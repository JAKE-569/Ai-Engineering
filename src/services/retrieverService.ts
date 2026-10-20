import { vectorDbConfig, vectorDbEnabled } from '../config/vectorDb';
import { embedTexts } from './embeddingService';

export async function retrieveFromVectorDb(query: string, filter: { trade?: string }, _fallback: any[] = [], limit = 5) {
  if (!vectorDbEnabled()) throw new Error('VECTOR_DB_URL is required for NVIDIA RAG. Run the vector DB seed first.');
  const [vector] = await embedTexts([query]);
  const response = await fetch(`${vectorDbConfig.url}/rest/v1/rpc/match_engineering_rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: vectorDbConfig.serviceRoleKey, Authorization: `Bearer ${vectorDbConfig.serviceRoleKey}` },
    // Retrieve a wider candidate set first; legal relevance is refined below
    // using the actual code/title/content terms from the drawing evidence.
    body: JSON.stringify({ query_embedding: vector, match_trade: filter.trade || null, match_count: Math.max(limit * 4, 20) }),
  });
  if (!response.ok) throw new Error(`Supabase pgvector RPC ${response.status}: ${await response.text()}`);
  const queryTerms = Array.from(new Set((query.match(/[가-힣A-Za-z][가-힣A-Za-z0-9·-]{1,}/g) || []).map((term) => term.toLowerCase())))
    .filter((term) => !['도면', '검토', '확인', '내용', '기준', '필요', 'page', 'drawing'].includes(term));
  const results = ((await response.json()) as any[])
    .map((item: any) => {
      const searchable = `${item.code || ''} ${item.clause || ''} ${item.content || ''}`.toLowerCase();
      const lexicalHits = queryTerms.filter((term) => searchable.includes(term)).length;
      const lexicalScore = queryTerms.length ? lexicalHits / queryTerms.length : 0;
      // Semantic similarity finds candidates; lexical overlap prevents a
      // merely similar but unrelated legal chapter from becoming the basis.
      const retrievalScore = Number(item.similarity || 0) * 0.7 + lexicalScore * 0.3;
      return { ...item, semanticScore: item.similarity, lexicalScore, retrievalScore };
    })
    .sort((a, b) => b.retrievalScore - a.retrievalScore)
    .slice(0, limit);
  if (!results.length) throw new Error(`No indexed rules found in Supabase table: ${vectorDbConfig.collection}`);
  return results;
}
