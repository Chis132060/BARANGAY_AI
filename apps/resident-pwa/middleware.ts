import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/pending-approval", "/support", "/reset-password", "/auth", "/chat", "/announcements"];
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
      // Resolve the role in two steps instead of relying on an embedded
      // relationship. This avoids treating a relation lookup failure as an
      // actual non-resident role after a successful login.
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .maybeSingle();
      if (userError) {
        console.warn("[PWA Middleware] Could not load user profile role:", userError.message);
      } else if (userData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("name")
          .eq("id", userData.role_id)
          .maybeSingle();
        if (roleError) {
          console.warn("[PWA Middleware] Could not resolve role name:", roleError.message);
        } else {
          userRole = roleData?.name ?? null;
        }
      }
    }
  } catch (err) {
    const authError = err as { code?: string; message?: string };
    const missingRefreshToken = authError?.code === "refresh_token_not_found"
      || authError?.message?.includes("Invalid Refresh Token: Refresh Token Not Found");
    if (missingRefreshToken) {
      // Drop the stale local Supabase session so subsequent requests start cleanly.
      for (const cookie of request.cookies.getAll()) {
        if (cookie.name.startsWith("sb-")) {
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
  if (user && userRole !== "Resident" && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", userRole ? "admin_account" : "role_lookup");
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
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
        return NextResponse.redirect(redirectUrl);
      }
    } catch (err) {
      console.warn("[PWA Middleware] Resident verification check failed:", err);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }
  if (user && (pathname === "/login" || pathname === "/register") && userRole === "Resident") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|workbox-.*\\.js|.*\\.(?:js|css|map|json|txt|ico|webmanifest|woff2?|ttf|otf|wasm|svg|png|jpg|jpeg|gif|webp)$).*)"],
};
