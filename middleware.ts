import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Read server session cookie
  const session = req.cookies.get("session")?.value || null;

  const pathname = req.nextUrl.pathname;

  // PUBLIC ROUTES (no login required)
  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
  ];

  // If the route is public → allow access
  if (publicRoutes.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // PROTECTED ROUTES (must be logged in)
  const protectedRoutes = [
    "/",                     
    "/user",
    "/user/register",
    "/user/profile",
    "/user/driver-profile",
  ];

  const isProtected = protectedRoutes.some((p) => pathname.startsWith(p));

  // If route is protected AND user is NOT logged in → redirect to login
  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Otherwise allow the request
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",                     // Home protected
    "/user/:path*",          // All user pages protected
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
  ],
};
