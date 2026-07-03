import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const explicitDemoAuth = import.meta.env.VITE_ALLOW_DEMO_AUTH as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);
export const isDemoAuthEnabled = explicitDemoAuth === "true" || import.meta.env.MODE === "development";

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null;

// Token is held in localStorage which is accessible to any JS on the same origin.
// This is the simplest auth model but means an XSS injection can exfiltrate the session.
// A production hardening step would be moving to httpOnly cookies via a backend proxy.
const TOKEN_KEY = "archmind_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
