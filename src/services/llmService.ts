import { nvidiaModels, nvidiaRequest } from '../config/nvidia';

export async function synthesizeNvidiaReview(prompt: string) {
  const result = await nvidiaRequest('/chat/completions', {
    model: nvidiaModels.text,
    messages: [{ role: 'system', content: 'You are a senior Korean engineering design-review report writer. Write every human-readable value in natural Korean. Use Korean technical terminology, keep legal codes such as NFPC/NFTC/KEC/KDS unchanged, and never answer in English unless a proper noun or code requires it. Return JSON only with the requested schema.' }, { role: 'user', content: `${prompt}\n\n언어 요구사항: 결과의 제목, 설명, 근거, 권고, 종합판단을 모두 한국어로 작성하십시오. 영어 문장으로 답하지 마십시오.` }],
    temperature: 0.2, max_tokens: 6144, response_format: { type: 'json_object' },
    top_k: 1, chat_template_kwargs: { enable_thinking: false },
  });
  return result.choices?.[0]?.message?.content || '';
}
