import { createBrowserClient } from "@supabase/ssr";
import { getMockSupabaseClient } from "./mock-supabase";
import { isMockSupabaseEnabled } from "./config";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || isMockSupabaseEnabled()) {
    return getMockSupabaseClient() as any;
  }
  return createBrowserClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
