import { useMutation } from "@tanstack/react-query";
import { api, type LoginRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useAuth() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const managerLoginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.managerLogin.path, {
        method: api.auth.managerLogin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }
      return api.auth.managerLogin.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({ title: "Welcome back!", description: `Logged in as Manager: ${data.username}` });
      setLocation("/manager/dashboard");
    },
    onError: (error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  const driverLoginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.driverLogin.path, {
        method: api.auth.driverLogin.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid username or password");
        throw new Error("Login failed");
      }
      return api.auth.driverLogin.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      toast({ title: "Welcome back!", description: `Logged in as Driver: ${data.name}` });
      setLocation("/vehicle/dashboard");
    },
    onError: (error) => {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: api.auth.logout.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      toast({ title: "Logged out", description: "See you next time." });
      setLocation("/");
    },
  });

  return {
    loginManager: managerLoginMutation.mutate,
    isManagerLoggingIn: managerLoginMutation.isPending,
    loginDriver: driverLoginMutation.mutate,
    isDriverLoggingIn: driverLoginMutation.isPending,
    logout: logoutMutation.mutate,
  };
}
