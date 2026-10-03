import { expoDb } from '../database/client';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Linking, Platform } from 'react-native';

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
   * Get currently authenticated Google user from local storage
   */
  async getStoredGoogleUser(): Promise<GoogleAuthUser | null> {
    try {
      this._ensureTable();
      const res = (expoDb as any).getFirstSync(
        'SELECT val FROM arise_kv WHERE key = ?',
        [GOOGLE_USER_KV_KEY]
      ) as { val: string } | null;
      if (res?.val) {
        return JSON.parse(res.val) as GoogleAuthUser;
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
   * Save authenticated Google user to storage
   */
  async saveGoogleUser(user: GoogleAuthUser): Promise<void> {
    try {
      this._ensureTable();
      expoDb.runSync(
        'INSERT OR REPLACE INTO arise_kv (key, val) VALUES (?, ?)',
        [GOOGLE_USER_KV_KEY, JSON.stringify(user)]
      );
    } catch (e) {
      console.warn('[GoogleAuth] Error saving user:', e);
    }
  },

  /**
   * Sign out and clear stored Google user session
   */
  async signOutGoogle(): Promise<void> {
    try {
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

    if (!rawUrl) return result;

    // 2. Parse from rawUrl string (both # hash fragment and ? query params)
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

      // 1. Check if tokens are in hash/query (Implicit Grant)
      if (parsed.accessToken && parsed.refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error) {
          console.warn('[GoogleAuth] setSession error:', error.message);
          return { success: false, error: error.message };
        }
        activeSession = data.session;
      }
      // 2. Check if authorization code is present (PKCE Flow)
      else if (parsed.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (error) {
          console.warn('[GoogleAuth] exchangeCodeForSession error:', error.message);
          return { success: false, error: error.message };
        }
        activeSession = data.session;
      }
      // 3. Fallback: check if session is already stored
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
      try {
        const { cloudSyncService } = await import('./cloudSyncService');
        const res = await cloudSyncService.restoreFromCloud(email);
        restored = res.restored;
        if (!restored) {
          await cloudSyncService.saveToCloud(email);
        }
      } catch (syncErr) {
        console.warn('[GoogleAuth] Cloud backup restore note:', syncErr);
      }

      return {
        success: true,
        user: googleUser,
        restored,
      };
    } catch (e: any) {
      console.error('[GoogleAuth] handleOAuthCallback exception:', e);
      return {
        success: false,
        error: e?.message || 'Unexpected error processing Google authentication',
      };
    }
  },

  /**
   * Sign in or register with Google credentials (One-Tap / Account Chooser flow)
   */
  async signInWithAccount(params: {
    displayName: string;
    email: string;
    photoUrl?: string | null;
  }): Promise<GoogleAuthUser> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.displayName.trim() || cleanEmail.split('@')[0];

    const googleUser: GoogleAuthUser = {
      id: `google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      email: cleanEmail,
      displayName: cleanName,
      photoUrl: params.photoUrl || null,
      provider: 'google',
      linkedAt: new Date().toISOString(),
    };

    await this.saveGoogleUser(googleUser);
    return googleUser;
  },
};
