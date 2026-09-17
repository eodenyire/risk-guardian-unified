import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PrtGapEntry {
  id: string;
  risk_type_id: string;
  as_of_date: string;
  dimension: string;
  bucket: string;
  bucket_order: number;
  currency: string;
  exposure: number;
  offset_amount: number;
  limit_value: number | null;
  notes: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string) => (supabase as any).from(name);

export const usePrtGapEntries = (riskTypeId?: string) =>
  useQuery({
    queryKey: ["prt-gap-entries", riskTypeId ?? "all"],
    queryFn: async () => {
      let q = t("prt_gap_entries").select("*").order("bucket_order");
      if (riskTypeId) q = q.eq("risk_type_id", riskTypeId);
      const { data, error } = await q;
      if (error) throw error;
      return data as PrtGapEntry[];
    },
    enabled: riskTypeId !== undefined ? Boolean(riskTypeId) : true,
  });

export const useUpsertPrtGapEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<PrtGapEntry> & { id?: string }) => {
      const { id, created_at: _c, updated_at: _u, ...body } = p;
      if (id) {
        const { error } = await t("prt_gap_entries").update(body).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await t("prt_gap_entries").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prt-gap-entries"] });
      toast.success("Gap entry saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeletePrtGapEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("prt_gap_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prt-gap-entries"] });
      toast.success("Gap entry removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
