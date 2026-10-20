export const vectorDbConfig = {
  provider: 'supabase' as const,
  get url() { return (process.env.SUPABASE_URL || '').replace(/\/$/, ''); },
  get serviceRoleKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY || ''; },
  get collection() { return process.env.VECTOR_DB_COLLECTION || 'engineering_rules'; },
};

export const vectorDbEnabled = () => Boolean(vectorDbConfig.url && vectorDbConfig.serviceRoleKey);
