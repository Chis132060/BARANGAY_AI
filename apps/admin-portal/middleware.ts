import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "./lib/supabase/constants";

const PUBLIC_ROUTES = ["/login", "/auth/callback"];
const ADMIN_ROLES = new Set(["Super Admin", "Barangay Captain", "Secretary", "Treasurer", "Staff"]);

export async function middleware(request: NextRequest) {
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
  if (!url || !anonKey) return new NextResponse("Supabase is not configured.", { status: 503 });

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll() {
        return request.cookies.getAll();
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
  let roleLookupFailed = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data?.user;
    if (error) {
      const authError = error as { code?: string; message?: string };
      const staleSession = authError.code === "refresh_token_not_found"
        || authError.code === "session_not_found"
        || authError.message?.includes("Invalid Refresh Token: Refresh Token Not Found")
        || authError.message?.includes("Session not found");
      if (staleSession) {
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
        console.warn("[Middleware] Supabase auth check failed:", error.message);
      }
    }
    if (user) {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .maybeSingle();
      if (userError) {
        const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
        if (metaRole && ADMIN_ROLES.has(metaRole)) {
          userRole = metaRole;
          roleLookupFailed = false;
        } else {
          roleLookupFailed = true;
          console.warn("[Admin Middleware] Could not load user role ID:", userError.message);
        }
      } else if (userData?.role_id) {
        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("name")
          .eq("id", userData.role_id)
          .maybeSingle();
        if (roleError) {
          const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
          if (metaRole && ADMIN_ROLES.has(metaRole)) {
            userRole = metaRole;
            roleLookupFailed = false;
          } else {
            roleLookupFailed = true;
            console.warn("[Admin Middleware] Could not resolve role name:", roleError.message);
          }
        } else {
          userRole = roleData?.name ?? null;
          roleLookupFailed = !userRole;
        }
      } else {
        const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
        if (metaRole && ADMIN_ROLES.has(metaRole)) {
          userRole = metaRole;
          roleLookupFailed = false;
        } else {
          roleLookupFailed = true;
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
      console.warn("[Middleware] Supabase auth check failed:", err);
    }
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  if (user && !isPublic && roleLookupFailed) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "role_lookup");
    return redirectWithCookies(redirectUrl);
  }
  if (user && !isPublic && !ADMIN_ROLES.has(userRole ?? "")) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "unauthorized");
    return redirectWithCookies(redirectUrl);
  }
  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return redirectWithCookies(redirectUrl);
  }
  if (user && pathname === "/login" && ADMIN_ROLES.has(userRole ?? "")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return redirectWithCookies(redirectUrl);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
