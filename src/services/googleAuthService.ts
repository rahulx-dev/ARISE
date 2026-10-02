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
