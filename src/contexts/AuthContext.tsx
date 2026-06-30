import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, Profile, setStoredToken } from "@/lib/api";
import { isSupabaseConfigured, supabase, getStoredToken } from "@/lib/supabase";

type AuthState = {
  user: Profile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ needsConfirmation: boolean }>;
  signInWithOAuth: (provider: "google" | "github") => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function syncTokenAndProfile(token: string): Promise<Profile> {
  setStoredToken(token);
  return api.me();
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
    (async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          try {
            const profile = await syncTokenAndProfile(data.session.access_token);
            setUser(profile);
          } catch {
            setStoredToken(null);
          }
        }
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session?.access_token) {
            try {
              const profile = await syncTokenAndProfile(session.access_token);
              setUser(profile);
            } catch {
              setStoredToken(null);
              setUser(null);
            }
          } else if (!getStoredToken()) {
            setUser(null);
          }
        });
        setLoading(false);
        return () => sub.subscription.unsubscribe();
      }
      await refreshProfile();
      setLoading(false);
    })();
  }, [refreshProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        const profile = await syncTokenAndProfile(data.session.access_token);
        setUser(profile);
      }
      return;
    }
    const res = await api.demoLogin(email, password);
    setUser(res.user);
    setStoredToken(res.access_token);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName?: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (data.session) {
        const profile = await syncTokenAndProfile(data.session.access_token);
        setUser(profile);
        return { needsConfirmation: false };
      }
      // No session => Supabase requires email confirmation before first login.
      return { needsConfirmation: true };
    }
    const res = await api.demoLogin(email, password, fullName);
    setUser(res.user);
    setStoredToken(res.access_token);
    return { needsConfirmation: false };
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "github") => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("OAuth requires Supabase configuration. Use email sign-in for local dev.");
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
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
