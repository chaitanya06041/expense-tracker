import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns a Supabase client that injects the current device token
 * as the `x-app-token` header on every request, satisfying the
 * token-gated RLS policies on the app data tables.
 */
export function authedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { 'x-app-token': token },
    },
  });
}
