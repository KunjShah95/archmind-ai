import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, Profile, setStoredToken } from "@/lib/api";
import { isDemoAuthEnabled, isSupabaseConfigured, supabase, getStoredToken } from "@/lib/supabase";

type AuthState = {
  user: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signInWithOAuth: (provider: "google") => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthState | null>(null);

async function syncTokenAndProfile(token: string, supabaseUser?: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<Profile> {
  setStoredToken(token);
  try {
    const profile = await api.me();
    // Exchange for httpOnly cookie (best-effort — don't fail login if this fails)
    api.exchangeSession(token).catch(() => {});
    return profile;
  } catch (err) {
    // Backend unreachable — fall back to Supabase user data so auth still works
    if (supabaseUser) {
      return {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        full_name: (supabaseUser.user_metadata?.full_name as string | null) ?? null,
        plan: "free",
        analyses_used: 0,
        analyses_limit: 10,
      };
    }
    throw err;
  }
}

async function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Authentication timed out. Please try again.")), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const profile = await api.me();
      setUser(profile);
    } catch {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribeFn: (() => void) | undefined;
    (async () => {
      if (isSupabaseConfigured && supabase) {
        const isOAuthRedirect = window.location.hash.includes("access_token") ||
                                window.location.search.includes("code=");

        // Subscribe to onAuthStateChange BEFORE calling getSession()
        // to avoid a race where SIGNED_IN fires between the two calls. (Issue #2)
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.access_token) {
            try {
              const profile = await syncTokenAndProfile(session.access_token, session.user);
              if (!cancelled) setUser(profile);
            } catch {
              // Don't delete the token on API failure — show a toast instead (Issue #4)
              toast.error("Logged in but couldn't reach the server. Please try again.");
              if (!cancelled) setUser(null);
            }
          } else if (!getStoredToken()) {
            if (!cancelled) setUser(null);
          }
          // SIGNED_IN fires after PKCE exchange completes → now safe to unlock UI
          if (!cancelled) setLoading(false);
        });
        unsubscribeFn = () => sub.subscription.unsubscribe();

        // 1. Check for existing session
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          try {
            const profile = await syncTokenAndProfile(data.session.access_token, data.session.user);
            if (!cancelled) setUser(profile);
          } catch {
            // Don't delete the token on API failure — show a toast instead (Issue #4)
            toast.error("Logged in but couldn't reach the server. Please try again.");
          }
          if (!cancelled) setLoading(false);
          return;
        }

        // 2. Normal loads (no OAuth redirect): unlock UI immediately.
        //    OAuth redirects: keep loading true until SIGNED_IN fires (step 2).
        if (!isOAuthRedirect) {
          if (!cancelled) setLoading(false);
        }
      } else if (!cancelled) {
        await refreshProfile();
        setLoading(false);
      }
    })();
    return () => { cancelled = true; unsubscribeFn?.(); };
  }, [refreshProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      if (error) throw error;
      if (data.session) {
        const profile = await syncTokenAndProfile(data.session.access_token, data.user ?? undefined);
        setUser(profile);
      }
      return;
    }

    if (!isDemoAuthEnabled) {
      throw new Error("Email authentication is unavailable. Please use configured OAuth or contact support.");
    }

    const res = await api.demoLogin(email, password);
    setUser(res.user);
    setStoredToken(res.access_token);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      }));
      if (error) throw error;
      if (data.session) {
        const profile = await syncTokenAndProfile(data.session.access_token, data.user ?? undefined);
        setUser(profile);
        return { needsConfirmation: false };
      }
      // No session => Supabase requires email confirmation before first login.
      return { needsConfirmation: true };
    }

    if (!isDemoAuthEnabled) {
      throw new Error("Sign up is unavailable. Please contact support.");
    }

    const res = await api.demoLogin(email, password, fullName);
    setUser(res.user);
    setStoredToken(res.access_token);
    return { needsConfirmation: false };
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google") => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("OAuth requires Supabase configuration. Use email sign-in for local dev.");
    }
    const { error } = await withTimeout(supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    }));
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    api.sessionLogout().catch(() => {});
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithEmail, signUpWithEmail, signInWithOAuth, signOut, refreshProfile }),
    [user, loading, signInWithEmail, signUpWithEmail, signInWithOAuth, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
