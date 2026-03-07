"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client" | "supplier";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isLoading, isAuthenticated, realRole } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    // Only redirect if realRole is loaded AND doesn't match
    if (requiredRole && realRole && realRole !== requiredRole) {
      console.log("[AuthGuard] BLOCKED — realRole:", realRole, "!== requiredRole:", requiredRole);
      window.location.href = "/dashboard";
    }
  }, [isLoading, isAuthenticated, realRole, requiredRole]);

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
  // realRole loaded but wrong → don't render (redirect in useEffect)
  if (requiredRole && realRole && realRole !== requiredRole) return null;

  return <>{children}</>;
}
