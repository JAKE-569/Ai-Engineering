export type ModelProvider = 'gpt' | 'claude';
export interface ProviderModelSettings { models: string[]; defaultModel: string; }
export type PgptModelSettings = Record<ModelProvider, ProviderModelSettings>;
export interface PgptModelCatalog { settings: PgptModelSettings; available: Record<ModelProvider, string[]>; }
