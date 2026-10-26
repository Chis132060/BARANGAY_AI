import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const ADMIN_ROLES = new Set(["Super Admin", "Barangay Captain", "Secretary", "Treasurer", "Staff"]);

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return new NextResponse("Supabase is not configured.", { status: 503 });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({ request });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  let user = null;
  let userRole: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
    if (user) {
      const { data: userData, error } = await supabase
        .from("users")
        .select("roles!inner(name)")
        .eq("id", user.id)
        .maybeSingle();
      const roleRelation = userData?.roles as { name: string } | { name: string }[] | null | undefined;
      userRole = error ? null : Array.isArray(roleRelation) ? roleRelation[0]?.name ?? null : roleRelation?.name ?? null;
    }
  } catch (err) {
    console.warn("[Middleware] Supabase auth check failed:", err);
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (user && !isPublic && !ADMIN_ROLES.has(userRole ?? "")) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "unauthorized");
    return NextResponse.redirect(redirectUrl);
  }
  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }
  if (user && pathname === "/login" && ADMIN_ROLES.has(userRole ?? "")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
