export function isMockSupabaseEnabled() {
  return process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true";
}
