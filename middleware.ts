import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const session = req.cookies.get("session")?.value || null;
  const pathname = req.nextUrl.pathname;

  // Public pages
  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
  ];

  // Allow public pages
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Protect everything under /user
  if (pathname.startsWith("/user") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Protect the home page "/" only when NOT logged in
  if (pathname === "/" && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/user/:path*",
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/about",
  ],
};
