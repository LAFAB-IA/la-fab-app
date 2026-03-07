"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client" | "supplier";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isLoading, isAuthenticated, realRole, user } = useAuth();
  const router = useRouter();

  // Use realRole (from backend) with fallback to user.role (may be overridden)
  const effectiveRole = realRole || user?.role || null;

  useEffect(() => {
    if (isLoading) return;
    console.log("[AuthGuard] isAuthenticated:", isAuthenticated, "realRole:", realRole, "user.role:", user?.role, "effectiveRole:", effectiveRole, "requiredRole:", requiredRole);
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requiredRole && effectiveRole && effectiveRole !== requiredRole) {
      console.log("[AuthGuard] BLOCKED — effectiveRole", effectiveRole, "!==", requiredRole);
      router.replace("/projets");
    }
  }, [isLoading, isAuthenticated, effectiveRole, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f0ee]">
        <div className="w-10 h-10 border-4 border-[#F4CF15] border-t-[#000000] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  // If effectiveRole is null (not yet loaded), don't block — show content
  if (requiredRole && effectiveRole && effectiveRole !== requiredRole) return null;

  return <>{children}</>;
}
