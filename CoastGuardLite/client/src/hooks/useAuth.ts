import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User, FishermanProfile } from "@shared/schema";

interface AuthUser extends User {
  fishermanProfile: FishermanProfile | null;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isFisherman: user?.role === "fisherman",
    isCoastGuard: user?.role === "coastguard",
    hasFishermanProfile: !!user?.fishermanProfile,
    error,
  };
}
