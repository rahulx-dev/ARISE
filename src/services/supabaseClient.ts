import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { expoDb } from '../database/client.native';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xfdxnefrzuaxxjfwsuvi.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_T1Hw5voJRbbY7Ov04rWgnw_8TYlR8xI';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof SUPABASE_URL === 'string' &&
    SUPABASE_URL.startsWith('https://') &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_ANON_KEY.length > 20
  );
};

// Pure SQLite key-value adapter for Supabase session persistence
const sqliteStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      expoDb.runSync('CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)');
      const res = expoDb.getFirstSync<{ val: string }>('SELECT val FROM arise_kv WHERE key = ?', [key]);
      return res?.val ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      expoDb.runSync('CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)');
      expoDb.runSync('INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)', [key, value]);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      expoDb.runSync('CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)');
      expoDb.runSync('DELETE FROM arise_kv WHERE key = ?', [key]);
    } catch {}
  },
};

let client: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: sqliteStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    console.log('[Supabase] Initialized cloud client successfully');
  } catch (err) {
    console.warn('[Supabase] Initialization warning:', err);
  }
} else {
  console.log('[Supabase] Running in offline mode (No Supabase URL/Key provided yet)');
}

export const supabase = client;

const USER_DEVICE_ID_KEY = '@arise_user_cloud_id';

/**
 * Get or generate a persistent user UUID for authenticated cloud sync
 */
export async function getCloudUserId(): Promise<string> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes.data?.session?.user?.id) {
        return sessionRes.data.session.user.id;
      }
      // If no active session, ensure anonymous auth session
      const authId = await ensureAuthenticatedUser();
      if (authId) return authId;
    } catch {}
  }

  try {
    let id = await sqliteStorage.getItem(USER_DEVICE_ID_KEY);
    if (!id) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      id = `warrior_${randomPart}_${timePart}`;
      await sqliteStorage.setItem(USER_DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'warrior_local_device';
  }
}

/**
 * Ensures client has active authenticated / anonymous session
 */
export async function ensureAuthenticatedUser(): Promise<string> {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        await sqliteStorage.setItem(USER_DEVICE_ID_KEY, data.session.user.id);
        return data.session.user.id;
      }

      // Create anonymous session so auth.uid() is populated on PostgreSQL
      const signInRes = await supabase.auth.signInAnonymously();
      if (signInRes.data?.user?.id) {
        await sqliteStorage.setItem(USER_DEVICE_ID_KEY, signInRes.data.user.id);
        return signInRes.data.user.id;
      }

      const currentUser = (await supabase.auth.getUser()).data?.user;
      if (currentUser?.id) {
        await sqliteStorage.setItem(USER_DEVICE_ID_KEY, currentUser.id);
        return currentUser.id;
      }
    } catch (authErr) {
      console.warn('[SupabaseAuth] Anonymous auth session note:', authErr);
    }
  }

  return getCloudUserId();
}
