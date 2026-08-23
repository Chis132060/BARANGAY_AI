import { createBrowserClient } from "@supabase/ssr";
import { getMockSupabaseClient } from "./mock-supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
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

