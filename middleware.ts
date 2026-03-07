import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/projets",
  "/projet",
  "/factures",
  "/facture",
  "/dashboard",
  "/admin",
  "/notifications",
  "/profil",
  "/supplier/dashboard",
  "/supplier/consultations",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  // ── "/" redirect for authenticated users → /projets (AuthGuard handles role redirect) ─
  if (pathname === "/") {
    if (token) return NextResponse.redirect(new URL("/projets", request.url));
    return NextResponse.next();
  }

  // ── No token on protected route → redirect to login ────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // ── Already-logged-in user hitting /login → send to /projets ───────────────
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
