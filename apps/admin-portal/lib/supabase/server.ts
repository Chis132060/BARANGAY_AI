import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getMockSupabaseClient } from "./mock-supabase";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const cookieStore = cookies();

  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
    return getMockSupabaseClient(cookieStore) as any;
  }
  if (!url || !anonKey) {
    throw new Error("Missing Supabase configuration for admin portal.");
  }

  return createServerClient(
    url,
    anonKey,
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

