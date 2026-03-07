import { NextRequest, NextResponse } from "next/server";

function decodeJwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    // Supabase JWT has decoded.role = "authenticated" (auth role, not app role)
    // App role is in user_metadata or app_metadata
    const appRole =
      decoded.user_metadata?.role ??
      decoded.app_metadata?.role ??
      decoded.user_role ??
      decoded.user?.role ??
      null;
    // Ignore Supabase auth roles like "authenticated", "anon", "service_role"
    const topRole = decoded.role;
    if (topRole && !["authenticated", "anon", "service_role"].includes(topRole)) {
      return topRole;
    }
    return appRole;
  } catch {
    return null;
  }
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

  // Debug: log middleware decisions for admin routes
  if (pathname.startsWith("/admin")) {
    const role = token ? decodeJwtRole(token) : null;
    console.log("[MIDDLEWARE]", pathname, "token:", token ? "present(" + token.length + "chars)" : "MISSING", "role:", role);
  }

  // ── "/" redirect for authenticated users ───────────────────────────────────
  if (pathname === "/") {
    if (token) {
      const role = decodeJwtRole(token);
      if (role === "admin") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      if (role === "supplier") return NextResponse.redirect(new URL("/supplier/dashboard", request.url));
      return NextResponse.redirect(new URL("/projets", request.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // ── No token on protected route → redirect to login ────────────────────────
  if (isProtected && !token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url)
    );
  }

  // ── Role-based: /admin routes ──────────────────────────────────────────────
  if (token && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const role = decodeJwtRole(token);
    if (role !== "admin") return NextResponse.redirect(new URL("/projets", request.url));
  }

  // ── Role-based: /supplier routes (excluding public /supplier/register) ─────
  if (
    token &&
    (pathname === "/supplier/dashboard" ||
      pathname.startsWith("/supplier/dashboard/") ||
      pathname === "/supplier/consultations" ||
      pathname.startsWith("/supplier/consultations/"))
  ) {
    const role = decodeJwtRole(token);
    if (role !== "supplier" && role !== "admin")
      return NextResponse.redirect(new URL("/projets", request.url));
  }

  // ── Already-logged-in user hitting /login ──────────────────────────────────
  if (pathname === "/login" && token) {
    const role = decodeJwtRole(token);
    if (role === "admin") return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    if (role === "supplier") return NextResponse.redirect(new URL("/supplier/dashboard", request.url));
    return NextResponse.redirect(new URL("/projets", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
