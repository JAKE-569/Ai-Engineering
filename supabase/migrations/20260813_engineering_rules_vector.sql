create extension if not exists vector;

create table if not exists public.engineering_rules (
  id bigint generated always as identity primary key,
  code text not null,
  clause text,
  content text not null,
  trade text,
  source_url text,
  publisher text,
  embedding vector(2048),
  created_at timestamptz not null default now()
);

create index if not exists engineering_rules_embedding_hnsw
  on public.engineering_rules using hnsw (embedding vector_cosine_ops);

create or replace function public.match_engineering_rules(
  query_embedding vector(2048),
  match_trade text,
  match_count int default 5
)
returns table (
  id bigint,
  code text,
  clause text,
  content text,
  trade text,
  source_url text,
  publisher text,
  similarity float
)
language sql stable security definer set search_path = public
as $$
  select r.id, r.code, r.clause, r.content, r.trade, r.source_url, r.publisher,
         1 - (r.embedding <=> query_embedding) as similarity
  from public.engineering_rules r
  where match_trade is null or r.trade = match_trade or r.trade = '공통'
  order by r.embedding <=> query_embedding
  limit match_count;
$$;
