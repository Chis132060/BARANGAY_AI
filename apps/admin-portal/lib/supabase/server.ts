import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getMockSupabaseClient } from "./mock-supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cookieStore = cookies();
  if (!url || url.includes("pedevaqxrudflvostpja") || process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
    return getMockSupabaseClient(cookieStore) as any;
  }

  return createServerClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handled by middleware or server action
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Handled by middleware or server action
          }
        },
      },
    }
  );
}

