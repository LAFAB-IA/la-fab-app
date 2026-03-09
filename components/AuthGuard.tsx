"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client" | "supplier";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isLoading, isAuthenticated, user, realRole } = useAuth();
  const effectiveRole = user?.role || realRole;

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    // Use effective role (includes role_override) for access check
    if (requiredRole && effectiveRole && effectiveRole !== requiredRole) {
      console.log("[AuthGuard] BLOCKED — effectiveRole:", effectiveRole, "!== requiredRole:", requiredRole);
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated, effectiveRole, requiredRole]);

  // Still loading auth → spinner
  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh",
      }}>
        <div style={{
          width: 40, height: 40,
          border: "4px solid #F4CF15",
          borderTop: "4px solid #000000",
          borderRadius: "50%",
          animation: "auth-spin 1s linear infinite",
        }} />
        <style>{`@keyframes auth-spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Not authenticated → don't render (redirect in useEffect)
  if (!isAuthenticated) return null;

  // realRole not yet loaded → show content (don't block)
  // effectiveRole loaded but wrong → don't render (redirect in useEffect)
  if (requiredRole && effectiveRole && effectiveRole !== requiredRole) return null;

  return <>{children}</>;
}
