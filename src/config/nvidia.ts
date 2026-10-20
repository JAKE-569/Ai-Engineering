const baseUrl = () => (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');

export const nvidiaModels = {
  // NVIDIA Omni multimodal model. The newer Nano VL endpoint was checked but
  // did not return within the smoke-test timeout on the current hosted API;
  // keep the known-good drawing extraction path as the production default.
  vision: process.env.NVIDIA_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
  embedding: process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nemotron-3-embed-1b',
  text: process.env.NVIDIA_TEXT_MODEL || 'nvidia/nemotron-3-nano-30b-a3b',
};

export async function nvidiaRequest(path: string, body: unknown) {
  if (!process.env.NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY is not configured');
  const maxAttempts = Math.max(1, Number(process.env.NVIDIA_MAX_ATTEMPTS || 3));
  const timeoutMs = Number(process.env.NVIDIA_REQUEST_TIMEOUT_MS || 300000);
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();
    try {
      const response = await fetch(`${baseUrl()}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const responseText = await response.text();
      if (!response.ok) {
        const error = new Error(`NVIDIA API ${response.status}: ${responseText}`);
        // NVIDIA NIM can transiently return 500 while an engine worker is
        // recycling. Retry only transient failures; preserve 400-level errors.
        if (response.status < 500 || attempt === maxAttempts) throw error;
        lastError = error;
      } else {
        try {
          return JSON.parse(responseText) as any;
        } catch {
          throw new Error(`NVIDIA API returned invalid JSON after ${Date.now() - startedAt}ms (${path})`);
        }
      }
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      const normalized = (error as Error)?.name === 'AbortError'
        ? new Error(`NVIDIA API timeout after ${elapsed}ms (${path})`)
        : new Error(`NVIDIA API network error after ${elapsed}ms (${path}): ${(error as Error)?.message || error}`);
      lastError = normalized;
      const retryable = (error as Error)?.name === 'AbortError' || /NVIDIA API 5\d\d|fetch failed|network error/i.test(normalized.message);
      if (!retryable || attempt === maxAttempts) throw normalized;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(1500 * attempt, 4000)));
  }
  throw lastError || new Error(`NVIDIA API request failed (${path})`);
}
