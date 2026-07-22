import { createBrowserClient } from "@supabase/ssr";
import { getMockSupabaseClient } from "./mock-supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes("pedevaqxrudflvostpja") || process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
    return getMockSupabaseClient() as any;
  }
  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

