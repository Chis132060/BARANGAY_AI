import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getMockSupabaseClient } from "@/lib/supabase/mock-supabase";

const PUBLIC_ROUTES = ["/login", "/register", "/pending-approval", "/auth", "/chat", "/announcements", "/home"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabase: any;
  if (!url || process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
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
    
    if (user && process.env.NEXT_PUBLIC_MOCK_SUPABASE !== "true") {
      const { data: userData } = await supabase
        .from("users")
        .select("roles!inner(name)")
        .eq("id", user.id)
        .maybeSingle();
      
      userRole = Array.isArray(userData?.roles) 
        ? userData?.roles[0]?.name 
        : userData?.roles?.name;
    }
  } catch (err) {
    console.warn("[PWA Middleware] Supabase auth check failed, using fallback:", err);
  }

  const { pathname } = request.nextUrl;
  // API routes perform their own authentication/rate limiting. Do not turn
  // guest API requests into an HTML login redirect (which breaks JSON clients).
  if (pathname.startsWith("/api/")) return response;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // If a non-Resident attempts to access a protected PWA route, log them out and redirect
  if (user && userRole && userRole !== "Resident" && !isPublic) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "admin_account");
    return NextResponse.redirect(redirectUrl);
  }

  if (user && process.env.NEXT_PUBLIC_MOCK_SUPABASE !== "true") {
    try {
      const { data: resident } = await supabase
        .from("residents")
        .select("verification_status")
        .eq("user_id", user.id)
        .maybeSingle();

      const status = resident?.verification_status;
      const isApprovalRoute = pathname.startsWith("/pending-approval");
      const isAuthCallback = pathname.startsWith("/auth");

      if ((status === "Pending" || status === "Rejected") && !isApprovalRoute && !isAuthCallback) {
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

  if (user && (pathname === "/login" || pathname === "/register") && (!userRole || userRole === "Resident")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}


export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
