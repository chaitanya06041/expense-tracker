/**
 * URL-token authentication.
 *
 * HOW IT WORKS:
 *  1. First visit on a new device → no ?token in URL → Login page is shown.
 *  2. Enter the correct password → a unique token is generated and whitelisted.
 *     The app redirects to  ?token=<value>  — bookmark/save this URL on the device.
 *  3. Every subsequent visit via that bookmarked URL → token is read from the URL,
 *     validated against the whitelist, and the app opens with no login needed.
 *
 * WHITELIST STORAGE:
 *  The whitelist lives in localStorage under 'et_token_whitelist'.
 *  It must be present on whatever device/browser performed the login — which is
 *  always the case since login creates the token on that same device.
 *
 * SETUP:
 *  Create a .env file at the project root:
 *    VITE_AUTH_PASSWORD=your-secret-password
 */

const WHITELIST_KEY = 'et_token_whitelist';
const PASSWORD      = import.meta.env.VITE_AUTH_PASSWORD as string | undefined;

// ---------- whitelist helpers ----------

function getWhitelist(): string[] {
  try {
    const raw = localStorage.getItem(WHITELIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addToWhitelist(token: string): void {
  const list = getWhitelist();
  if (!list.includes(token)) {
    list.push(token);
    localStorage.setItem(WHITELIST_KEY, JSON.stringify(list));
  }
}

// ---------- public API ----------

/** Reads ?token=<value> from the current URL. Returns null if absent. */
export function getUrlToken(): string | null {
  return new URLSearchParams(window.location.search).get('token');
}

/** Returns true if the given token exists in the whitelist. */
export function isTokenTrusted(token: string): boolean {
  return getWhitelist().includes(token);
}

/**
 * Validates the password. On success, generates a unique device token,
 * adds it to the whitelist, and navigates to ?token=<value>.
 * Returns false if the password is wrong.
 */
export function loginWithPassword(password: string): boolean {
  if (!PASSWORD) {
    console.warn('[auth] VITE_AUTH_PASSWORD is not set. All logins will be rejected.');
    return false;
  }
  if (password !== PASSWORD) return false;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  addToWhitelist(token);

  const params = new URLSearchParams(window.location.search);
  params.set('token', token);
  window.location.replace(`${window.location.pathname}?${params.toString()}${window.location.hash}`);

  return true;
}
