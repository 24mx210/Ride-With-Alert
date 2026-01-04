import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useEmergencies() {
  return useQuery({
    queryKey: [api.emergency.list.path],
    queryFn: async () => {
      const res = await fetch(api.emergency.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch emergencies");
      return api.emergency.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s as backup to websockets
  });
}

export function useTriggerEmergency() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Note: Trigger uses multipart/form-data for potential video file
      const res = await fetch(api.emergency.trigger.path, {
        method: api.emergency.trigger.method,
        body: formData, // FormData automatically sets correct Content-Type boundary
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to trigger emergency");
      return api.emergency.trigger.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      toast({ 
        title: "EMERGENCY ALERT SENT", 
        description: "Help has been requested. Stay calm.", 
        variant: "destructive",
        duration: 10000 
      });
    },
    onError: () => {
      toast({ 
        title: "ALERT FAILED", 
        description: "Could not send emergency signal. Please call emergency services directly.", 
        variant: "destructive",
        duration: Infinity
      });
    }
  });
}

export function useAcknowledgeEmergency() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (emergencyId: number) => {
      const res = await fetch(api.emergency.acknowledge.path, {
        method: api.emergency.acknowledge.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emergencyId }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to acknowledge emergency");
      return api.emergency.acknowledge.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.emergency.list.path] });
      toast({ title: "Acknowledged", description: "Emergency status updated." });
    },
  });
}
