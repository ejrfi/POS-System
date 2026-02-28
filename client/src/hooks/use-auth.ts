import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@shared/routes";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Types for auth
type LoginData = z.infer<typeof api.auth.login.input>;

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return null;

      const res = await fetch(api.auth.me.path, { 
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("auth_token");
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
    staleTime: Infinity, // User session rarely changes unexpectedly
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }
      
      const data = await res.json();
      localStorage.setItem("auth_token", data.token);
      return api.auth.login.responses[200].parse(data.user);
    },
    onSuccess: (user) => {
      queryClient.setQueryData([api.auth.me.path], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("auth_token");
      if (token) {
        const shiftRes = await fetch(api.cashierShifts.active.path, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (shiftRes.ok) {
          const data = await shiftRes.json();
          if (data?.shift) {
            throw new Error("Tidak bisa logout: shift masih aktif. Tutup shift terlebih dahulu.");
          }
        }

        const logoutRes = await fetch(api.auth.logout.path, {
          method: api.auth.logout.method,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!logoutRes.ok && logoutRes.status !== 401) {
          throw new Error("Logout gagal. Silakan coba lagi.");
        }
      }

      localStorage.removeItem("auth_token");
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: async () => {
      try {
        await logoutMutation.mutateAsync();
        return true;
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Logout gagal",
          description: err?.message || "Logout gagal. Silakan coba lagi.",
        });
        return false;
      }
    },
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
}
