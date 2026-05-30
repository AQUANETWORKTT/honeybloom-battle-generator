import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const publicRoutes = ["/login", "/live/honeybloom-schedule"];

  const isPublic = publicRoutes.some((route) => path.startsWith(route));

  if (isPublic) {
    return NextResponse.next();
  }

  const authCookie = req.cookies.get("honeybloom-auth")?.value;

  if (authCookie !== "true") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/generator/:path*", "/schedule/:path*"],
};
