import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string) => (supabase as any).from(name);

export interface Control {
  id: string;
  name: string;
  description: string | null;
  risk_type_id: string | null;
  control_type: string;
  frequency: string;
  owner: string | null;
  effectiveness: string;
  status: string;
  source: string;
  last_tested_at: string | null;
  next_test_due: string | null;
  created_at: string;
  updated_at: string;
  risk_types?: { name: string } | null;
}

export interface RCSA {
  id: string;
  title: string;
  business_unit: string;
  period: string;
  risk_type_id: string | null;
  inherent_score: number;
  control_score: number;
  residual_score: number;
  status: string;
  assessor: string | null;
  approver: string | null;
  due_date: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  notes: string | null;
  risk_types?: { name: string } | null;
}

export interface DataSourceRow {
  id: string;
  name: string;
  source_type: string;
  description: string | null;
  location: string | null;
  integration_status: string;
  sync_status: string;
  records_synced: number;
  last_sync_at: string | null;
  error_message: string | null;
}

// CONTROLS
export const useControls = () =>
  useQuery({
    queryKey: ["controls"],
    queryFn: async () => {
      const { data, error } = await t("controls").select("*, risk_types(name)").order("name");
      if (error) throw error;
      return data as Control[];
    },
  });

export const useUpsertControl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Control> & { id?: string }) => {
      if (p.id) {
        const { error } = await t("controls").update(p).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await t("controls").insert(p);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["controls"] }); toast.success("Control saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteControl = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("controls").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["controls"] }); toast.success("Control deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// RCSA
export const useRCSA = () =>
  useQuery({
    queryKey: ["rcsa"],
    queryFn: async () => {
      const { data, error } = await t("rcsa_assessments").select("*, risk_types(name)").order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as RCSA[];
    },
  });

export const useUpsertRCSA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<RCSA> & { id?: string }) => {
      const body: Partial<RCSA> = { ...p };
      if (p.status === "submitted" && !p.submitted_at) body.submitted_at = new Date().toISOString();
      if (p.status === "approved" && !p.approved_at) body.approved_at = new Date().toISOString();
      if (p.id) {
        const { error } = await t("rcsa_assessments").update(body).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await t("rcsa_assessments").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rcsa"] }); toast.success("Assessment saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteRCSA = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("rcsa_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["rcsa"] }); toast.success("Assessment deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });
};

// DATA SOURCES (CRUD + simulated test/sync)
export const useDataSourcesList = () =>
  useQuery({
    queryKey: ["data-sources-full"],
    queryFn: async () => {
      const { data, error } = await t("data_sources").select("*").order("name");
      if (error) throw error;
      return data as DataSourceRow[];
    },
  });

export const useUpsertDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<DataSourceRow> & { id?: string }) => {
      if (p.id) {
        const { error } = await t("data_sources").update(p).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await t("data_sources").insert(p);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources-full"] });
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success("Data source saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteDataSource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("data_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources-full"] });
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success("Data source removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useTestConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Simulated connectivity test — flips status and updates last_sync_at
      const { error } = await t("data_sources").update({
        integration_status: "connected",
        sync_status: "success",
        last_sync_at: new Date().toISOString(),
        error_message: null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["data-sources-full"] });
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success("Connection test successful");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useTriggerSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: DataSourceRow) => {
      const added = Math.floor(20 + Math.random() * 200);
      const { error } = await t("data_sources").update({
        sync_status: "success",
        last_sync_at: new Date().toISOString(),
        records_synced: (row.records_synced ?? 0) + added,
        integration_status: "connected",
        error_message: null,
      }).eq("id", row.id);
      if (error) throw error;
      return added;
    },
    onSuccess: (added) => {
      qc.invalidateQueries({ queryKey: ["data-sources-full"] });
      qc.invalidateQueries({ queryKey: ["data-sources"] });
      toast.success(`Sync complete — ${added} records ingested`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
