import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getMockSupabaseClient } from "@/lib/supabase/mock-supabase";

const PUBLIC_ROUTES = ["/login", "/register", "/auth", "/home", "/chat", "/announcements"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let supabase: any;
  if (!url || url.includes("pedevaqxrudflvostpja") || process.env.NEXT_PUBLIC_MOCK_SUPABASE === "true") {
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
    supabase = createServerClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  } catch (err) {
    console.warn("[PWA Middleware] Supabase auth check failed, using fallback:", err);
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
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
