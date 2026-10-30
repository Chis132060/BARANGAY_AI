import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/supabase/constants";

const PUBLIC_ROUTES = ["/login", "/register", "/support", "/reset-password", "/auth", "/chat", "/announcements"];
const isPublicRoute = (pathname: string) => PUBLIC_ROUTES.some(
  (route) => pathname === route || pathname.startsWith(`${route}/`)
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/sw.js" ||
    pathname.startsWith("/_next/") ||
    /\.(?:js|css|map|json|txt|ico|webmanifest|woff2?|ttf|otf|wasm|svg|png|jpg|jpeg|gif|webp)$/i.test(pathname)
  ) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const refreshedCookies = new Map<string, { value: string; options: CookieOptions }>();
  const refreshResponse = () => {
    response = NextResponse.next({ request });
    for (const [name, cookie] of refreshedCookies) response.cookies.set({ name, ...cookie });
  };
  const redirectWithCookies = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
    if (isPublicRoute(pathname)) return response;
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        refreshedCookies.set(name, { value, options });
        refreshResponse();
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        refreshedCookies.set(name, { value: "", options });
        refreshResponse();
      },
    },
  });

  let user = null;
  let userRole: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
    if (user) {
      // Resolve the role in two steps instead of relying on an embedded
      // relationship. This avoids treating a relation lookup failure as an
      // actual non-resident role after a successful login.
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .maybeSingle();
      if (userError) {
        const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
        if (metaRole && metaRole.toLowerCase() === "resident") {
          userRole = "Resident";
        } else {
          console.warn("[PWA Middleware] Could not load user profile role:", userError.message);
        }
      } else if (userData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("name")
          .eq("id", userData.role_id)
          .maybeSingle();
        if (roleError) {
          const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
          if (metaRole && metaRole.toLowerCase() === "resident") {
            userRole = "Resident";
          } else {
            console.warn("[PWA Middleware] Could not resolve role name:", roleError.message);
          }
        } else {
          userRole = roleData?.name ?? null;
        }
      } else {
        const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
        if (metaRole && metaRole.toLowerCase() === "resident") {
          userRole = "Resident";
        }
      }
    }
  } catch (err) {
    const authError = err as { code?: string; message?: string };
    const staleSession = authError?.code === "refresh_token_not_found"
      || authError?.code === "session_not_found"
      || authError?.message?.includes("Invalid Refresh Token: Refresh Token Not Found")
      || authError?.message?.includes("Session not found");
    if (staleSession) {
      // Drop stale Supabase cookies so the next request can start a clean login.
      for (const cookie of request.cookies.getAll()) {
        if (
          cookie.name === AUTH_COOKIE_NAME
          || cookie.name.startsWith(`${AUTH_COOKIE_NAME}.`)
          || cookie.name === `${AUTH_COOKIE_NAME}-code-verifier`
        ) {
          request.cookies.delete(cookie.name);
          response.cookies.delete(cookie.name);
        }
      }
    } else {
      console.warn("[PWA Middleware] Supabase auth check failed:", err);
    }
  }

  // API routes authenticate in their own handlers and should keep JSON responses.
  if (pathname.startsWith("/api/")) return response;
  const isPublic = isPublicRoute(pathname);
  const isLoginOrRegister = pathname === "/login" || pathname === "/register";
  if (
    user
    && userRole !== "Resident"
    && (pathname === "/pending-approval" || pathname === "/register" || !isPublic)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", userRole ? "admin_account" : "role_lookup");
    return redirectWithCookies(redirectUrl);
  }

  if (user && userRole === "Resident") {
    try {
      const { data: resident } = await supabase
        .from("residents")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();
      const status = resident?.verification_status;
      const isApprovalRoute = pathname.startsWith("/pending-approval");
      const isAuthCallback = pathname.startsWith("/auth") || pathname === "/reset-password";
      const isSupportRoute = pathname === "/support" || pathname.startsWith("/support/");
      if (status !== "Verified" && !isApprovalRoute && !isAuthCallback && !isSupportRoute) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/pending-approval";
        return redirectWithCookies(redirectUrl);
      }
    } catch (err) {
      console.warn("[PWA Middleware] Resident verification check failed:", err);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return redirectWithCookies(redirectUrl);
    }
  }

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return redirectWithCookies(redirectUrl);
  }
  if (user && isLoginOrRegister && userRole === "Resident") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return redirectWithCookies(redirectUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|workbox-.*\\.js|.*\\.(?:js|css|map|json|txt|ico|webmanifest|woff2?|ttf|otf|wasm|svg|png|jpg|jpeg|gif|webp)$).*)"],
};
