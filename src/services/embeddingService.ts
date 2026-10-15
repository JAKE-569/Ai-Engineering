import { nvidiaModels, nvidiaRequest } from '../config/nvidia';

export async function embedTexts(texts: string[]) {
  const result = await nvidiaRequest('/embeddings', { model: nvidiaModels.embedding, input: texts, input_type: 'query' });
  return (result.data || []).map((item: any) => item.embedding as number[]);
}
