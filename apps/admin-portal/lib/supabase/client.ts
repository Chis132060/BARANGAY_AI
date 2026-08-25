import { createBrowserClient } from "@supabase/ssr";
import { isMockSupabaseEnabled } from "./config";
import { getMockSupabaseClient } from "./mock-supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (isMockSupabaseEnabled()) {
    return getMockSupabaseClient() as any;
  }
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration for admin portal.");
  }

  return createBrowserClient(
    url,
    anonKey
  );
}

