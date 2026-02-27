import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

const DASHBOARD_PREFIX = "/dashboard";
const LOGIN_PATH = "/login";
const UNAUTHORIZED_PATH = "/dashboard/unauthorized";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isDashboardPath = pathname === DASHBOARD_PREFIX || pathname.startsWith(`${DASHBOARD_PREFIX}/`);
  const isLoginPath = pathname === LOGIN_PATH;

  if (isDashboardPath && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginPath && user) {
    const redirectUrl = request.nextUrl.clone();
    const requestedPath = request.nextUrl.searchParams.get("next");
    redirectUrl.pathname =
      requestedPath && requestedPath.startsWith(DASHBOARD_PREFIX)
        ? requestedPath
        : DASHBOARD_PREFIX;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === UNAUTHORIZED_PATH && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = LOGIN_PATH;
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
  ],
};
