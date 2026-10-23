import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getMockSupabaseClient } from "@/lib/supabase/mock-supabase";
import { isMockSupabaseEnabled } from "@/lib/supabase/config";

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
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabase: any;
  const mockSupabaseEnabled = process.env.NODE_ENV !== "production" && isMockSupabaseEnabled();
  // Never silently enable mock auth when production Supabase configuration is missing.
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === "production") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Authentication unavailable" }, { status: 503 });
      }
      if (pathname === "/login" || pathname === "/register") return response;
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }
  }
  if (!url || mockSupabaseEnabled) {
    const requestCookieStore = {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: any) => {
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: any) => {
        response.cookies.set({ name, value: "", ...options });
      },
    };
    supabase = getMockSupabaseClient(requestCookieStore);
  } else {
    if (!url || !anonKey) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      return NextResponse.redirect(redirectUrl);
    }

    supabase = createServerClient(
      url,
      anonKey,
      {
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
      }
    );
  }

  let user = null;
  let userRole = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
    if (user && mockSupabaseEnabled) userRole = user.user_metadata?.role || "Resident";
    
    if (user && !mockSupabaseEnabled) {
      const { data: userData, error } = await supabase
        .from("users")
        .select("roles!inner(name)")
        .eq("id", user.id)
        .maybeSingle();
      
      userRole = !error && (Array.isArray(userData?.roles)
        ? userData?.roles[0]?.name 
        : userData?.roles?.name);
    }
  } catch (err) {
    console.warn("[PWA Middleware] Supabase auth check failed, using fallback:", err);
  }

  // API routes perform their own authentication/rate limiting. Do not turn
  // guest API requests into an HTML login redirect (which breaks JSON clients).
  if (pathname.startsWith("/api/")) return response;
  const isPublic = isPublicRoute(pathname);

  // Unknown/missing roles must not pass through to resident-only pages.
  if (user && userRole !== "Resident" && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "admin_account");
    return NextResponse.redirect(redirectUrl);
  }

  if (user && !mockSupabaseEnabled) {
    try {
      const { data: resident } = await supabase
        .from("residents")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      const status = resident?.verification_status;
      const isApprovalRoute = pathname.startsWith("/pending-approval");
      const isAuthCallback = pathname.startsWith("/auth") || pathname === "/reset-password";
      // Pending and rejected applicants must be able to request help without verification.
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|workbox-.*\\.js|.*\\.(?:js|css|map|json|txt|ico|webmanifest|woff2?|ttf|otf|wasm|svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
