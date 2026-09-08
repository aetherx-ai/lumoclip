import type { SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient> | null = null;

export const getSupabase = (): Promise<SupabaseClient> => {
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(
      ({ createClient }) => {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl) {
          throw new Error(
            "Missing VITE_SUPABASE_URL. Check your frontend .env file."
          );
        }

        if (!supabaseAnonKey) {
          throw new Error(
            "Missing VITE_SUPABASE_ANON_KEY. Check your frontend .env file."
          );
        }

        return createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: "pkce",
          },
        });
      }
    );
  }

  return clientPromise;
};