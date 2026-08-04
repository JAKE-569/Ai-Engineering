import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, ReviewItem, Project, SafetyItem, DesignErrorItem, VeItem } from '../types';

let supabaseClient: SupabaseClient | null = null;
let customUrl = '';
let customKey = '';

export function saveSupabaseConfig(url: string, anonKey: string) {
  customUrl = url;
  customKey = anonKey;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('posco_supabase_url', url);
    localStorage.setItem('posco_supabase_key', anonKey);
  }
}

export function getSupabaseConfig(): SupabaseConfig {
  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('posco_supabase_url') : null;
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem('posco_supabase_key') : null;

  const url = customUrl || storedUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const anonKey = customKey || storedKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return {
    url,
    anonKey,
    isConnected: Boolean(url && anonKey),
  };
}

export function initSupabase(url: string, anonKey: string): SupabaseClient | null {
  if (!url || !anonKey) return null;
  try {
    supabaseClient = createClient(url, anonKey);
    return supabaseClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConnected) return null;

  if (!supabaseClient) {
    supabaseClient = initSupabase(config.url, config.anonKey);
  }
  return supabaseClient;
}

export async function fetchReviewItemsFromSupabase(): Promise<ReviewItem[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('review_items').select('*');
    if (error || !data) return null;
    return data.map((row: any) => ({
      id: row.id,
      fileName: row.file_name,
      fileType: row.file_type || 'PDF',
      reviewType: row.review_type,
      status: row.status,
      result: row.result,
      updatedAt: row.updated_at,
      projectId: row.project_id,
      description: row.description,
      cadUrl: row.cad_url,
      engineerNotes: row.engineer_notes,
    }));
  } catch (e) {
    console.error('Error fetching review_items:', e);
    return null;
  }
}

export async function syncInitialDataToSupabase(
  projects: Project[],
  reviews: ReviewItem[],
  safety: SafetyItem[],
  errors: DesignErrorItem[],
  ve: VeItem[]
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Upsert review items
    const formattedReviews = reviews.map((r) => ({
      file_name: r.fileName,
      file_type: r.fileType,
      review_type: r.reviewType,
      status: r.status,
      result: r.result,
      updated_at: new Date().toISOString(),
      project_id: r.projectId,
      description: r.description,
      cad_url: r.cadUrl,
      engineer_notes: r.engineerNotes,
    }));
    await client.from('review_items').insert(formattedReviews);
    return true;
  } catch (err) {
    console.error('Error syncing to Supabase:', err);
    return false;
  }
}

// SQL Schema Helper string to display in the Supabase Setup guide
export const SUPABASE_SCHEMA_SQL = `-- Supabase Schema for POSCO AI Doc Review System

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Review Items (Dashboard Items)
CREATE TABLE IF NOT EXISTS review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL,
  result TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  project_id TEXT,
  description TEXT,
  cad_url TEXT,
  engineer_notes TEXT
);

-- 3. Safety & Law Items
CREATE TABLE IF NOT EXISTS safety_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT,
  reviewed_at TEXT,
  summary TEXT NOT NULL,
  law_regulation TEXT,
  severity TEXT NOT NULL,
  status TEXT
);

-- 4. Design Errors Table
CREATE TABLE IF NOT EXISTS design_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_code TEXT NOT NULL,
  dwg_file TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  ratio TEXT,
  cad_url TEXT
);

-- 5. Cost & VE Items Table
CREATE TABLE IF NOT EXISTS ve_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  sub_description TEXT,
  location TEXT,
  impact_kw BIGINT DEFAULT 0,
  status TEXT NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read review_items" ON review_items FOR SELECT USING (true);
CREATE POLICY "Public insert review_items" ON review_items FOR INSERT WITH CHECK (true);
`;
