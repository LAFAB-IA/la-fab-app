import { NextRequest, NextResponse } from "next/server";

/** Best-effort role extraction from Supabase JWT — fallback "client" */
function jwtRole(token: string): string {
  try {
    const payload = token.split(".")[1];
    const d = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return (
      d.user_metadata?.role ??
      d.app_metadata?.role ??
      d.user_role ??
      "client"
    );
  } catch {
    return "client";
  }
}

function redirectForRole(role: string): string {
  if (role === "admin") return "/admin/dashboard";
  if (role === "supplier") return "/supplier/dashboard";
  return "/projets";
}

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

  // ── "/" → redirect by role ────────────────────────────────────────────────
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL(redirectForRole(jwtRole(token)), request.url));
    }
    return NextResponse.next();
  }

  // ── No token on protected route → login ───────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (isProtected && !token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // ── Already logged in hitting /login → redirect by role ───────────────────
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL(redirectForRole(jwtRole(token)), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
