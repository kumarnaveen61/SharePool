import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/dashboard", "/groups", "/memberships", "/requests", "/profile", "/platform"];
const SESSION_COOKIE = "sharepool_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? verifySession(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/groups/:path*",
    "/memberships/:path*",
    "/requests/:path*",
    "/profile/:path*",
    "/platform/:path*",
  ],
  runtime: "nodejs",
};
