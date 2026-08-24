const MOCK_PROJECT_REF = "pedevaqxrudflvostpja";

export function isMockSupabaseEnabled(url = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  return process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true" || url?.includes(MOCK_PROJECT_REF) === true;
}
