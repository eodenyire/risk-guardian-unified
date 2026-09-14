import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types for our risk data (tables created via migration)
export interface RiskType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  risk_level: string;
  risk_score: number;
  trend: string;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  name: string;
  source_type: string;
  connection_config: Record<string, unknown>;
  integration_status: string;
  last_sync_at: string | null;
  sync_status: string;
  records_synced: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncLogEntry {
  id: string;
  data_source_id: string;
  sync_type: string;
  target_system: string | null;
  records_processed: number;
  records_failed: number;
  status: string;
  error_details: unknown;
  started_at: string;
  completed_at: string | null;
  data_sources?: { name: string; source_type: string };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (table: string) => (supabase as any).from(table);

export const useRiskTypes = () => {
  return useQuery({
    queryKey: ["risk-types"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_types")
        .select("*")
        .order("risk_score", { ascending: false });
      if (error) throw error;
      return data as RiskType[];
    },
  });
};

export const useDataSources = () => {
  return useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await fromTable("data_sources")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DataSource[];
    },
  });
};

export const useSyncLog = () => {
  return useQuery({
    queryKey: ["sync-log"],
    queryFn: async () => {
      const { data, error } = await fromTable("sync_log")
        .select("*, data_sources(name, source_type)")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as SyncLogEntry[];
    },
  });
};
