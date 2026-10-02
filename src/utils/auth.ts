/**
 * URL-token authentication — backed by Supabase `auth_tokens` table.
 *
 * HOW IT WORKS:
 *  1. First visit on a new device → no ?token in URL → Login page is shown.
 *  2. Enter the correct password → a unique token is generated, inserted into
 *     the `auth_tokens` table, and the app redirects to ?token=<value>.
 *     Bookmark / save this URL on the device.
 *  3. Every subsequent visit via that bookmarked URL → token is read from the
 *     URL, validated against the DB, and the app opens with no login needed.
 *
 * SETUP:
 *  Create a .env file at the project root:
 *    VITE_AUTH_PASSWORD=your-secret-password
 *    VITE_SUPABASE_URL=https://your-project.supabase.co
 *    VITE_SUPABASE_ANON_KEY=your-anon-public-key
 */

import { supabase } from './supabase';

const PASSWORD = import.meta.env.VITE_AUTH_PASSWORD as string | undefined;

// ---------- public API ----------

/** Reads ?token=<value> from the current URL. Returns null if absent. */
export function getUrlToken(): string | null {
  return new URLSearchParams(window.location.search).get('token');
}

/**
 * Checks whether the given token exists in the `auth_tokens` table.
 * Returns false on any network/DB error (fail-closed).
 */
export async function isTokenTrusted(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('auth_tokens')
    .select('token')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return false;

  // Fire-and-forget: update last_seen timestamp
  supabase
    .from('auth_tokens')
    .update({ last_seen: new Date().toISOString() })
    .eq('token', token)
    .then(() => {});

  return true;
}

/**
 * Validates the password. On success, generates a unique device token,
 * inserts it into the `auth_tokens` table, and navigates to ?token=<value>.
 * Returns false if the password is wrong or the DB insert fails.
 */
export async function loginWithPassword(
  password: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!PASSWORD) {
    const msg = 'VITE_AUTH_PASSWORD is not configured on this deployment.';
    console.warn('[auth]', msg);
    return { ok: false, reason: msg };
  }
  if (password !== PASSWORD) {
    return { ok: false, reason: 'Incorrect password. Try again.' };
  }

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const { error } = await supabase.from('auth_tokens').insert({ token });
  if (error) {
    const msg = `Could not save login token: ${error.message}`;
    console.error('[auth]', msg);
    return { ok: false, reason: msg };
  }

  const params = new URLSearchParams(window.location.search);
  params.set('token', token);
  window.location.replace(
    `${window.location.pathname}?${params.toString()}${window.location.hash}`
  );

  return { ok: true };
}
