import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => (supabase as any).from(table);

export interface RiskRegisterEntry {
  id: string;
  risk_type_id: string | null;
  title: string;
  description: string | null;
  risk_level: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  source: string;
  status: string;
  owner: string | null;
  mitigation: string | null;
  residual_risk_level: string | null;
  created_at: string;
  updated_at: string;
  risk_types?: { name: string; category: string | null } | null;
}

export interface RiskRegisterInsert {
  risk_type_id?: string | null;
  title: string;
  description?: string | null;
  risk_level?: string;
  likelihood?: number;
  impact?: number;
  source?: string;
  status?: string;
  owner?: string | null;
  mitigation?: string | null;
  residual_risk_level?: string | null;
}

export const useRiskRegister = () => {
  return useQuery({
    queryKey: ["risk-register"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_register")
        .select("*, risk_types(name, category)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RiskRegisterEntry[];
    },
  });
};

export const useCreateRisk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: RiskRegisterInsert) => {
      const { data, error } = await fromTable("risk_register").insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-register"] }),
  });
};

export const useUpdateRisk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: RiskRegisterInsert & { id: string }) => {
      const { data, error } = await fromTable("risk_register").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-register"] }),
  });
};

export const useDeleteRisk = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("risk_register").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-register"] }),
  });
};
