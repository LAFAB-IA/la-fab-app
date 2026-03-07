"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "client" | "supplier";
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isLoading, isAuthenticated, realRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    console.log("[AuthGuard] isAuthenticated:", isAuthenticated, "realRole:", realRole, "requiredRole:", requiredRole);
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (requiredRole && realRole !== requiredRole) {
      console.log("[AuthGuard] BLOCKED — realRole", realRole, "!==", requiredRole);
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, realRole, requiredRole, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f0f0ee]">
        <div className="w-10 h-10 border-4 border-[#F4CF15] border-t-[#000000] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requiredRole && realRole !== requiredRole) return null;

  return <>{children}</>;
}
