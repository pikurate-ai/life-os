/** Authentication routing is independent of workspace contents and never carries credentials. */
export interface GoogleSignInOptions {
  origin: string;
  authDomain: string;
  embedded: boolean;
  mobile: boolean;
  basePath?: string;
}

export interface GoogleSignInPlan {
  method: 'external' | 'redirect' | 'popup';
  url?: string;
}

export const GOOGLE_REDIRECT_ATTEMPT_KEY = 'life-os:v2:auth:google-redirect-attempt';
const REDIRECT_ATTEMPT_LIFETIME = 15 * 60 * 1000;

function invalidConfiguration(message: string): Error {
  return Object.assign(new Error(message), { code: 'auth/invalid-auth-domain' });
}

function canonicalAuthOrigin(authDomain: string): string {
  // A Firebase authDomain is a hostname, never a URL or a redirect supplied by a query string.
  if (
    typeof authDomain !== 'string' ||
    authDomain.length > 253 ||
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(
      authDomain,
    )
  )
    throw invalidConfiguration(
      '로그인 서버 주소가 올바르지 않습니다. 관리자 설정을 확인해 주세요.',
    );
  let url: URL;
  try {
    url = new URL(`https://${authDomain}`);
  } catch {
    throw invalidConfiguration(
      '로그인 서버 주소가 올바르지 않습니다. 관리자 설정을 확인해 주세요.',
    );
  }
  if (url.hostname !== authDomain.toLowerCase())
    throw invalidConfiguration(
      '로그인 서버 주소가 올바르지 않습니다. 관리자 설정을 확인해 주세요.',
    );
  return url.origin;
}

function parseOrigin(origin: string): URL {
  const url = new URL(origin);
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('현재 앱 주소가 올바르지 않습니다. 앱을 새 창에서 열어 주세요.');
  return url;
}

function settingsPath(basePath = ''): string {
  if (
    typeof basePath !== 'string' ||
    (basePath !== '' && (!/^\/[a-z0-9/_-]*$/i.test(basePath) || basePath.includes('//')))
  )
    throw new Error('앱 경로가 올바르지 않습니다. 앱을 새 창에서 열어 주세요.');
  return `${basePath.replace(/\/+$/, '')}/?page=settings`;
}

/** Keep OAuth helpers and the app on one origin; a frame opens the real top-level app. */
export function getGoogleSignInPlan(options: GoogleSignInOptions): GoogleSignInPlan {
  const authOrigin = canonicalAuthOrigin(options.authDomain);
  const current = parseOrigin(options.origin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(current.hostname);
  const hostedSettings = `${authOrigin}/?page=settings`;
  if (options.embedded)
    return {
      method: 'external',
      url: loopback ? `${current.origin}${settingsPath(options.basePath)}` : hostedSettings,
    };
  if (!loopback && current.origin !== authOrigin)
    return { method: 'external', url: hostedSettings };
  return { method: options.mobile && !loopback ? 'redirect' : 'popup' };
}

/** Store only a short-lived timestamp, never identity, OAuth codes or tokens. */
export function markRedirectAttempt(storage: Pick<Storage, 'setItem'>, now = Date.now()): void {
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error('기기 시간을 확인한 뒤 로그인을 다시 시도해 주세요.');
  storage.setItem(GOOGLE_REDIRECT_ATTEMPT_KEY, JSON.stringify({ startedAt: now }));
}

/** Read once and clear even malformed or expired markers so failures do not loop forever. */
export function consumeRedirectAttempt(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  now = Date.now(),
): boolean {
  const raw = storage.getItem(GOOGLE_REDIRECT_ATTEMPT_KEY);
  if (raw === null) return false;
  storage.removeItem(GOOGLE_REDIRECT_ATTEMPT_KEY);
  try {
    const value: unknown = JSON.parse(raw);
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length !== 1 ||
      !('startedAt' in value) ||
      typeof value.startedAt !== 'number' ||
      !Number.isSafeInteger(value.startedAt) ||
      value.startedAt < 0 ||
      !Number.isSafeInteger(now)
    )
      return false;
    const age = now - value.startedAt;
    return age >= 0 && age <= REDIRECT_ATTEMPT_LIFETIME;
  } catch {
    return false;
  }
}

/** A returned page without a credential must not silently masquerade as a canceled login. */
export async function completeGoogleRedirect<T>(
  result: Promise<T | null>,
  hasCurrentUser: () => boolean,
  attempted: boolean,
): Promise<T | null> {
  const resolved = await result;
  if (attempted && resolved === null && !hasCurrentUser())
    throw Object.assign(
      new Error('Google 로그인 결과를 받지 못했습니다. 로그인 버튼을 눌러 다시 연결해 주세요.'),
      { code: 'auth/redirect-result-missing' },
    );
  return resolved;
}
