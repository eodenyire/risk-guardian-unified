import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VerifyCheck { step: string; ok: boolean; detail: string }
export interface Credentials {
  auth_type: "none" | "basic" | "bearer" | "api_key";
  secret: { username?: string; password?: string; token?: string; header_name?: string };
}

const invoke = async <T,>(name: string, body: unknown): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { const j = await error.context.json(); msg = j.error ?? msg; } catch { /* keep */ }
    }
    throw new Error(msg);
  }
  return data as T;
};

const refresh = (qc: ReturnType<typeof useQueryClient>) =>
  ["data-sources", "data-sources-full", "sync-log", "kris", "kri-observations"].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }));

export const useVerifySource = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { data_source_id: string; credentials?: Credentials; verify?: boolean }) =>
      invoke<{ ok: boolean; checks?: VerifyCheck[]; error?: string }>("verify-source", p),
    onSuccess: () => refresh(qc),
    onError: (e: Error) => toast.error(e.message),
  });
};

export interface SyncResult { ok: boolean; status?: string; processed?: number; errors?: { ref: string; error: string }[]; error?: string }

export const useGrcSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: { data_source_id: string; direction: "push" | "pull" }) => invoke<SyncResult>("grc-sync", p),
    onSuccess: (r) => {
      refresh(qc);
      if (r.error) toast.error(r.error);
      else if (r.errors?.length) toast.warning(`${r.processed ?? 0} synced, ${r.errors.length} failed`);
      else toast.success(`${r.processed ?? 0} record(s) synced`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export interface InsightResult {
  summary: string;
  overall_rating: "low" | "moderate" | "high" | "critical";
  patterns: { title: string; severity: string; risk_types: string[]; evidence: string; trend: string }[];
  actions: { priority: number; action: string; owner: string; due_in_days: number; rationale: string; linked_pattern: string }[];
}

export const useRiskInsights = () =>
  useMutation({
    mutationFn: (p: { observations: unknown[]; controls: unknown[]; context: string; include_register: boolean }) =>
      invoke<{ result: InsightResult }>("risk-insights", p),
    onError: (e: Error) => toast.error(e.message),
  });
