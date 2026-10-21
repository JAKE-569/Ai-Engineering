// Network setup for running on a company PC. Must run before any API module
// makes a request.
import fs from 'node:fs';
import tls from 'node:tls';

export type NetworkSetup = { systemCa: 'on' | 'off' | 'unsupported'; proxy: string | null };

export async function setupLocalNetwork(): Promise<NetworkSetup> {
  // Company networks often inspect HTTPS with their own root certificate.
  // Windows and the browser trust it, but Node only trusts its bundled list,
  // so outgoing calls fail with "fetch failed". Add the OS certificate store.
  let systemCa: NetworkSetup['systemCa'] = 'off';
  if (process.env.USE_SYSTEM_CA !== 'false') {
    const t = tls as any;
    if (typeof t.getCACertificates === 'function' && typeof t.setDefaultCACertificates === 'function') {
      try {
        // EXTRA_CA_CERTS_FILE: a company root certificate (.pem/.crt, Base64)
        // that IT hands out, for networks whose certificate is not in Windows.
        const extraFile = process.env.EXTRA_CA_CERTS_FILE;
        const extra = extraFile ? fs.readFileSync(extraFile, 'utf8').match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) || [] : [];
        t.setDefaultCACertificates([...new Set([...t.getCACertificates('default'), ...t.getCACertificates('system'), ...extra])]);
        systemCa = 'on';
      } catch {
        systemCa = 'unsupported';
      }
    } else {
      systemCa = 'unsupported';
    }
  }

  // Node's fetch ignores HTTPS_PROXY on its own; route it through undici.
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
  if (proxy) {
    const { EnvHttpProxyAgent, setGlobalDispatcher } = await import('undici');
    setGlobalDispatcher(new EnvHttpProxyAgent());
  }
  return { systemCa, proxy: proxy ? proxy.replace(/\/\/[^@/]*@/, '//***@') : null };
}

// Turns Node's generic "fetch failed" into the underlying network reason.
export function explainNetworkError(error: any): string {
  let cause = error?.cause;
  while (cause?.cause && !cause.code) cause = cause.cause;
  const code = cause?.code || error?.code || '';
  const hints: Record<string, string> = {
    DEPTH_ZERO_SELF_SIGNED_CERT: '회사 보안 장비가 HTTPS를 검사하고 있습니다. 회사 루트 인증서가 필요합니다.',
    SELF_SIGNED_CERT_IN_CHAIN: '회사 보안 장비가 HTTPS를 검사하고 있습니다. 회사 루트 인증서가 필요합니다.',
    UNABLE_TO_GET_ISSUER_CERT_LOCALLY: '회사 보안 장비가 HTTPS를 검사하고 있습니다. 회사 루트 인증서가 필요합니다.',
    UNABLE_TO_VERIFY_LEAF_SIGNATURE: '회사 보안 장비가 HTTPS를 검사하고 있습니다. 회사 루트 인증서가 필요합니다.',
    CERT_HAS_EXPIRED: '인증서가 만료되었거나 PC 시간이 맞지 않습니다.',
    ENOTFOUND: '주소를 찾지 못했습니다(DNS). 방화벽/프록시 또는 인터넷 연결을 확인하세요.',
    EAI_AGAIN: '주소를 찾지 못했습니다(DNS). 방화벽/프록시 또는 인터넷 연결을 확인하세요.',
    ECONNREFUSED: '연결이 거부되었습니다. 프록시 주소나 방화벽을 확인하세요.',
    ECONNRESET: '연결이 중간에 끊겼습니다. 방화벽이 차단했을 가능성이 큽니다.',
    ETIMEDOUT: '응답이 없습니다. 방화벽 차단 또는 프록시가 필요한 네트워크일 수 있습니다.',
    UND_ERR_CONNECT_TIMEOUT: '응답이 없습니다. 방화벽 차단 또는 프록시가 필요한 네트워크일 수 있습니다.',
  };
  const parts = [error?.message || String(error)];
  if (cause && cause !== error) parts.push(`원인: ${[code, cause.message].filter(Boolean).join(' ')}`);
  const causeMessage = String(cause?.message || '');
  if (hints[code]) parts.push(hints[code]);
  else if (/Proxy response \(407\)/.test(causeMessage)) parts.push('프록시 로그인이 필요합니다. HTTPS_PROXY에 아이디/비밀번호를 넣거나 IT에 문의하세요.');
  else if (/Proxy response \(\d+\)/.test(causeMessage)) parts.push('회사 프록시가 이 주소를 차단했습니다. IT 부서에 허용을 요청하세요.');
  return parts.join(' | ');
}
