import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface KRI {
  id: string;
  risk_type_id: string | null;
  name: string;
  description: string | null;
  metric_unit: string;
  current_value: number;
  green_threshold: number;
  amber_threshold: number;
  red_threshold: number;
  direction: "higher_is_worse" | "lower_is_worse";
  frequency: string;
  owner: string | null;
  source: string;
  status: "green" | "amber" | "red";
  trend: "up" | "down" | "stable";
  last_measured_at: string | null;
  created_at: string;
  updated_at: string;
  risk_types?: { name: string; category: string | null } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (t: string) => (supabase as any).from(t);

export const computeStatus = (k: Pick<KRI, "current_value" | "green_threshold" | "amber_threshold" | "red_threshold" | "direction">): KRI["status"] => {
  const { current_value: v, green_threshold: g, amber_threshold: a, red_threshold: r, direction } = k;
  if (direction === "higher_is_worse") {
    if (v >= r) return "red";
    if (v >= a) return "amber";
    return "green";
    }
  // lower_is_worse
  if (v <= r) return "red";
  if (v <= a) return "amber";
  return "green";
};

export const useKRIs = () =>
  useQuery({
    queryKey: ["kris"],
    queryFn: async () => {
      const { data, error } = await fromTable("kri_register")
        .select("*, risk_types(name, category)")
        .order("status", { ascending: true })
        .order("name");
      if (error) throw error;
      return data as KRI[];
    },
  });

export const useUpsertKRI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<KRI> & { id?: string }) => {
      const status = computeStatus({
        current_value: Number(payload.current_value ?? 0),
        green_threshold: Number(payload.green_threshold ?? 0),
        amber_threshold: Number(payload.amber_threshold ?? 0),
        red_threshold: Number(payload.red_threshold ?? 0),
        direction: (payload.direction ?? "higher_is_worse") as KRI["direction"],
      });
      const body = { ...payload, status, last_measured_at: new Date().toISOString() };
      if (payload.id) {
        const { error } = await fromTable("kri_register").update(body).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await fromTable("kri_register").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kris"] });
      toast.success("KRI saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteKRI = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("kri_register").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kris"] });
      toast.success("KRI deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
