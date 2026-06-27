import { createClient } from '@supabase/supabase-js';

let client = null;

/**
 * Lazily create a single Supabase client using the service-role key.
 * The service-role key bypasses RLS — it must NEVER reach the frontend; it
 * lives only in backend/.env (gitignored).
 */
export function getSupabase() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment'
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * Verify connectivity at boot (used by server.js). Throws on failure so the
 * process exits with a clear message instead of failing on first request.
 */
export async function verifyConnection() {
  const supabase = getSupabase();
  const { error } = await supabase.from('users').select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
  return true;
}

// Allow tests to inject a fresh client (e.g. after changing env).
export function resetSupabase() {
  client = null;
}
