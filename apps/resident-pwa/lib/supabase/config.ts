export function isMockSupabaseEnabled() {
  if (process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
    return true;
  }

  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) {
    return true;
  }

  try {
    const hostname = new URL(configuredUrl).hostname;
    return hostname === "pedevaqxrudflvostpja.supabase.co" || hostname === "your-project.supabase.co";
  } catch {
    return true;
  }
}
