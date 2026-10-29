import '../local-env';
const { setupLocalNetwork } = await import('../local-network');
await setupLocalNetwork();
const { generateGeminiJson, geminiBaseUrl, geminiError } = await import('../src/services/geminiService');
// Synthetic one-pixel PNG; no project drawings or local source files are transmitted.
const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN1cAAAAASUVORK5CYII=';
try {
  const result = await generateGeminiJson('This is a synthetic connectivity test image. Return only JSON with a short Korean summary string describing the image.', { image: { mimeType: 'image/png', data: image }, deadlineMs: 60000 });
  if (typeof result.data.summary !== 'string') throw new Error('JSON summary 필드가 없습니다.');
  console.log(JSON.stringify({ success: true, baseUrl: geminiBaseUrl(), model: result.model, imageAccepted: true, jsonResponse: true }));
} catch (error) {
  console.error(JSON.stringify({ success: false, baseUrl: geminiBaseUrl(), detail: geminiError(error) }));
  process.exitCode = 1;
}
