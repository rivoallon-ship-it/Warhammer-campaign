import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabasePublicKey, getSupabaseUrl } from "./env";

const protectedRoutes = ["/dashboard", "/campaigns"];
const authRoutes = ["/login", "/signup"];

function isRouteMatch(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getLegacyCampaignRoute(pathname: string) {
  const match = /^\/campaigns\/([^/]+)\/(?:map|orders)$/.exec(pathname);

  return match ? `/campaigns/${match[1]}` : null;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const legacyCampaignRoute = getLegacyCampaignRoute(request.nextUrl.pathname);

  if (legacyCampaignRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyCampaignRoute;
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublicKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isRouteMatch(request.nextUrl.pathname, protectedRoutes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isRouteMatch(request.nextUrl.pathname, authRoutes)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
