import { expoDb } from '../database/client';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Linking, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface GoogleAuthUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  provider: 'google';
  linkedAt: string;
}

const GOOGLE_USER_KV_KEY = '@arise_google_user';

export const googleAuthService = {
  _ensureTable(): void {
    try {
      expoDb.runSync(
        'CREATE TABLE IF NOT EXISTS arise_kv (key TEXT PRIMARY KEY, val TEXT)'
      );
    } catch {}
  },

  /**
   * Get currently authenticated Google user from secure storage
   */
  async getStoredGoogleUser(): Promise<GoogleAuthUser | null> {
    try {
      // 1. Read from OS-backed hardware SecureStore on native
      if (Platform.OS !== 'web') {
        const secureVal = await SecureStore.getItemAsync(GOOGLE_USER_KV_KEY);
        if (secureVal) {
          return JSON.parse(secureVal) as GoogleAuthUser;
        }
      } else if (typeof localStorage !== 'undefined') {
        const webVal = localStorage.getItem(GOOGLE_USER_KV_KEY);
        if (webVal) {
          return JSON.parse(webVal) as GoogleAuthUser;
        }
      }

      // 2. Migration: read legacy plaintext SQLite, write to SecureStore, and purge plaintext copy
      this._ensureTable();
      const res = (expoDb as any).getFirstSync(
        'SELECT val FROM arise_kv WHERE key = ?',
        [GOOGLE_USER_KV_KEY]
      ) as { val: string } | null;
      if (res?.val) {
        const user = JSON.parse(res.val) as GoogleAuthUser;
        if (Platform.OS !== 'web') {
          try {
            await SecureStore.setItemAsync(GOOGLE_USER_KV_KEY, res.val, {
              keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            });
            expoDb.runSync('DELETE FROM arise_kv WHERE key = ?', [GOOGLE_USER_KV_KEY]);
          } catch {}
        }
        return user;
      }
    } catch (e) {
      console.warn('[GoogleAuth] Error reading stored user:', e);
    }
    return null;
  },

  /**
   * Check if a Google user is linked
   */
  async isGoogleConnected(): Promise<boolean> {
    const user = await this.getStoredGoogleUser();
    return !!user && !!user.email;
  },

  /**
   * Save authenticated Google user strictly to hardware SecureStore
   */
  async saveGoogleUser(user: GoogleAuthUser): Promise<void> {
    const userJson = JSON.stringify(user);
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.setItemAsync(GOOGLE_USER_KV_KEY, userJson, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GOOGLE_USER_KV_KEY, userJson);
      }
      // HARD SECURITY RULE: Purge any plaintext copy from SQLite
      this._ensureTable();
      expoDb.runSync('DELETE FROM arise_kv WHERE key = ?', [GOOGLE_USER_KV_KEY]);
    } catch (e) {
      console.warn('[GoogleAuth] Error saving user to SecureStore:', e);
    }
  },

  /**
   * Sign out and clear stored Google user session from SecureStore
   */
  async signOutGoogle(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(GOOGLE_USER_KV_KEY);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(GOOGLE_USER_KV_KEY);
      }
      this._ensureTable();
      expoDb.runSync('DELETE FROM arise_kv WHERE key = ?', [GOOGLE_USER_KV_KEY]);
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    } catch (e) {
      console.warn('[GoogleAuth] Error signing out Google user:', e);
    }
  },

  /**
   * Check if Supabase cloud backend is configured with OAuth
   */
  isCloudOAuthReady(): boolean {
    return isSupabaseConfigured();
  },

  /**
   * Initiate Supabase Google OAuth in browser (if cloud backend is configured)
   */
  async startCloudOAuth(): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Cloud credentials not configured in .env',
      };
    }

    try {
      const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
      const redirectUrl = isWeb ? window.location.origin : 'arise://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
          skipBrowserRedirect: isWeb ? true : false,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (isWeb) {
        if (data?.url && typeof window !== 'undefined') {
          window.location.href = data.url;
          return { success: true, url: data.url };
        }
      }

      if (data?.url) {
        const canOpen = await Linking.canOpenURL(data.url);
        if (canOpen) {
          await Linking.openURL(data.url);
          return { success: true, url: data.url };
        }
      }

      return { success: false, error: 'Could not launch Google authentication browser' };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to start Google cloud authentication',
      };
    }
  },

  /**
   * Listen for OAuth state changes (e.g. after Google redirect)
   */
  initAuthListener(onUserLinked?: (user: GoogleAuthUser) => void): (() => void) {
    if (!isSupabaseConfigured() || !supabase) {
      return () => {};
    }

    const handleSession = async (session: any, forceRestore = false) => {
      if (!session?.user) return;
      const user = session.user;
      const email = (user.email || '').trim().toLowerCase();
      if (!email) return;

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0];
      const photoUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const googleUser: GoogleAuthUser = {
        id: user.id || `google_${Date.now()}`,
        email,
        displayName,
        photoUrl,
        provider: 'google',
        linkedAt: new Date().toISOString(),
      };

      await this.saveGoogleUser(googleUser);

      if (forceRestore) {
        try {
          const { cloudSyncService } = await import('./cloudSyncService');
          await cloudSyncService.restoreFromCloud(email);
        } catch (e) {
          console.warn('[GoogleAuth] Cloud sync after OAuth error:', e);
        }
      }

      onUserLinked?.(googleUser);
    };

    // Check immediate session on boot
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSession(session, false);
      }
    }).catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const isNewSignIn = event === 'SIGNED_IN';
        await handleSession(session, isNewSignIn);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  /**
   * Parse OAuth tokens or authorization code from a deep link callback URL
   */
  parseOAuthUrl(
    rawUrl?: string | null,
    fallbackParams?: Record<string, any>
  ): {
    accessToken?: string;
    refreshToken?: string;
    code?: string;
    error?: string;
    errorDescription?: string;
  } {
    const result: {
      accessToken?: string;
      refreshToken?: string;
      code?: string;
      error?: string;
      errorDescription?: string;
    } = {};

    // 1. Check fallbackParams from Expo Router
    if (fallbackParams) {
      if (fallbackParams.access_token) result.accessToken = String(fallbackParams.access_token);
      if (fallbackParams.refresh_token) result.refreshToken = String(fallbackParams.refresh_token);
      if (fallbackParams.code) result.code = String(fallbackParams.code);
      if (fallbackParams.error) result.error = String(fallbackParams.error);
      if (fallbackParams.error_description) result.errorDescription = String(fallbackParams.error_description);
    }

    // 2. Parse from rawUrl string with strict length bounding to prevent long-input DoS
    if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.length > 4096) return result;

    try {
      const hashIdx = rawUrl.indexOf('#');
      const queryIdx = rawUrl.indexOf('?');

      const segments: string[] = [];
      if (hashIdx !== -1) {
        segments.push(rawUrl.substring(hashIdx + 1));
      }
      if (queryIdx !== -1) {
        const queryEnd = hashIdx !== -1 && hashIdx > queryIdx ? hashIdx : rawUrl.length;
        segments.push(rawUrl.substring(queryIdx + 1, queryEnd));
      }

      for (const seg of segments) {
        const pairs = seg.split('&');
        if (pairs.length > 64) continue; // Bound query parameter count against DoS
        for (const pair of pairs) {
          const [k, ...vals] = pair.split('=');
          if (!k) continue;
          const val = decodeURIComponent(vals.join('='));
          const lowerKey = k.toLowerCase().trim();

          if (lowerKey === 'access_token') result.accessToken = val;
          else if (lowerKey === 'refresh_token') result.refreshToken = val;
          else if (lowerKey === 'code') result.code = val;
          else if (lowerKey === 'error') result.error = val;
          else if (lowerKey === 'error_description') result.errorDescription = val;
        }
      }
    } catch (e) {
      console.warn('[GoogleAuth] Error parsing OAuth URL:', e);
    }

    return result;
  },

  /**
   * Process deep link OAuth callback and authenticate Supabase session
   */
  async handleOAuthCallback(
    rawUrl?: string | null,
    fallbackParams?: Record<string, any>
  ): Promise<{
    success: boolean;
    user?: GoogleAuthUser;
    restored?: boolean;
    backup?: any;
    error?: string;
  }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase cloud client is not configured' };
    }

    try {
      const parsed = this.parseOAuthUrl(rawUrl, fallbackParams);

      if (parsed.error || parsed.errorDescription) {
        return {
          success: false,
          error: parsed.errorDescription || parsed.error || 'Authentication error from Google',
        };
      }

      let activeSession = null;

      // C5: NEVER accept raw tokens from a URL or params. Any deep link
      // (or pasted link) can carry an attacker's valid token; setSession()
      // would have signed this device in as that attacker. Only the PKCE
      // code flow is accepted: the code is useless without the code
      // verifier the SDK stored when THIS device started the sign-in.
      if (parsed.accessToken || parsed.refreshToken) {
        return {
          success: false,
          error: 'Tokens in the callback URL are not accepted. Please sign in again from the app.',
        };
      }

      // The callback must be the app's own OAuth route. On native the
      // redirect is always arise://auth/callback; anything else is a
      // foreign deep link and is rejected. (Web is exempt: the SDK's
      // detectSessionInUrl handling owns the web callback.)
      if (rawUrl && Platform.OS !== 'web' && !rawUrl.includes('auth/callback')) {
        return { success: false, error: 'Invalid OAuth callback URL.' };
      }

      // 1. Authorization code present (PKCE Flow)
      if (parsed.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error) {
          console.warn('[GoogleAuth] exchangeCodeForSession error:', error.message);
          return { success: false, error: error.message };
        }
        activeSession = data.session;
      }
      // 2. Fallback: check if session is already stored
      else {
        const { data } = await supabase.auth.getSession();
        activeSession = data.session;
      }

      if (!activeSession?.user) {
        return {
          success: false,
          error: 'No active Google session found after redirect',
        };
      }

      const user = activeSession.user;
      const email = (user.email || '').trim().toLowerCase();
      if (!email) {
        return { success: false, error: 'Google account did not provide an email address' };
      }

      const displayName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0];
      const photoUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const googleUser: GoogleAuthUser = {
        id: user.id || `google_${Date.now()}`,
        email,
        displayName,
        photoUrl,
        provider: 'google',
        linkedAt: new Date().toISOString(),
      };

      await this.saveGoogleUser(googleUser);

      // Check and restore cloud backup
      let restored = false;
      let cloudBackup = undefined;
      try {
        const { cloudSyncService } = await import('./cloudSyncService');
        const res = await cloudSyncService.restoreFromCloud(email);
        restored = res.restored;
        cloudBackup = res.backup;
      } catch (syncErr) {
        console.warn('[GoogleAuth] Cloud backup restore note:', syncErr);
      }

      return {
        success: true,
        user: googleUser,
        restored,
        backup: cloudBackup,
      };
    } catch (e: any) {
      console.error('[GoogleAuth] handleOAuthCallback exception:', e);
      return {
        success: false,
        error: e?.message || 'Unexpected error processing Google authentication',
      };
    }
  },
};
