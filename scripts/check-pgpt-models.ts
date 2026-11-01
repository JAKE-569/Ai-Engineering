import '../local-env';
import { readFile } from 'node:fs/promises';
import { setupLocalNetwork } from '../local-network';
import { generatePgptJson, pgptBaseUrl, reviewAiError, type PgptProvider } from '../src/services/pgptService';

await setupLocalNetwork();
const selected = process.argv[2];
if (selected && !['gpt', 'claude'].includes(selected)) throw new Error('Usage: npm run check:pgpt-models -- [gpt|claude]');
const providers: PgptProvider[] = selected ? [selected as PgptProvider] : ['gpt', 'claude'];
const image = (await readFile(new URL('../tests/fixtures/pgpt-connectivity.png', import.meta.url))).toString('base64');
for (const provider of providers) {
  try {
    const visual = await generatePgptJson(provider, 'This is a synthetic connectivity test. Describe the image in Korean, mentioning the square color. Return JSON only: {"summary":"description"}.', { image: { mimeType: 'image/png', data: image }, deadlineMs: 60000 });
    if (typeof visual.data.summary !== 'string' || !/파란|파랑|청색/.test(visual.data.summary)) throw new Error('시험 이미지의 파란색 정사각형을 확인하지 못했습니다.');
    const text = await generatePgptJson(provider, '한국어 문장 "연결 확인"을 summary 값에 넣은 JSON 객체만 반환하세요.', { deadlineMs: 60000 });
    if (!text.data.summary?.includes('연결 확인')) throw new Error('텍스트 입력 응답을 확인하지 못했습니다.');
    console.log(JSON.stringify({ provider, success: true, baseUrl: pgptBaseUrl(provider), model: visual.model, responseModel: visual.responseModel, imageAccepted: true, textAccepted: true, jsonResponse: true }));
  } catch (error) {
    process.exitCode = 1;
    console.error(JSON.stringify({ provider, success: false, detail: reviewAiError(error) }));
  }
}
