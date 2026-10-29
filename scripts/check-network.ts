import '../local-env';
import { geminiBaseUrl } from '../src/services/geminiService';
// Checks whether this PC can reach each service the app calls.
// Usage: npm run check-network
import { explainNetworkError, setupLocalNetwork } from '../local-network';

const setup = await setupLocalNetwork();
console.log(`\nWindows 인증서 사용: ${setup.systemCa}   프록시: ${setup.proxy || '없음'}\n`);

const targets: [string, string][] = [
  ['P-GPT Gemini', geminiBaseUrl() + '/v1beta/models'],
  ['Google Cloud Vision', 'https://vision.googleapis.com/'],
  ['Google 로그인 토큰(ADC)', 'https://oauth2.googleapis.com/'],
  ['NVIDIA', 'https://integrate.api.nvidia.com/'],
];
if (process.env.SUPABASE_URL) targets.push(['Supabase', process.env.SUPABASE_URL]);

let failed = 0;
for (const [name, url] of targets) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    console.log(`  [OK]   ${name}  (${new URL(url).host}, HTTP ${response.status})`);
  } catch (error) {
    failed += 1;
    console.log(`  [실패] ${name}  (${new URL(url).host})\n         ${explainNetworkError(error)}`);
  }
}
console.log(failed ? `\n${failed}개 주소에 연결하지 못했습니다. 위 메시지를 IT 부서에 전달하세요.\n` : '\n모든 주소에 HTTP 연결됩니다. 인증·모델·이미지 지원은 별도 호출 검증이 필요합니다.\n');
