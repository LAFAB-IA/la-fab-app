import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES = [
  "/projets",
  "/projet",
  "/factures",
  "/facture",
  "/dashboard",
  "/admin",
  "/notifications",
  "/profil",
];

const PUBLIC_ROUTES = ["/login", "/", "/supplier/register", "/auth/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/projets", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
