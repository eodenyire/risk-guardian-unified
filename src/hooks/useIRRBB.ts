import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = (name: string) => (supabase as any).from(name);

export const IRRBB_RISK_TYPE_ID = "f136894e-e887-4e7d-9dba-f20a88812128";

export interface GapEntry {
  id: string;
  as_of_date: string;
  currency: string;
  bucket: string;
  bucket_order: number;
  rate_sensitive_assets: number;
  rate_sensitive_liabilities: number;
  off_balance_sheet: number;
  notes: string | null;
  source: string;
}

export interface IrrbbLimit {
  id: string;
  metric: string;
  scenario: string;
  basis: string;
  currency: string;
  limit_value: number;
  green_threshold: number;
  amber_threshold: number;
  red_threshold: number;
  unit: string;
  owner: string | null;
  status: string;
  escalation: string | null;
}

export interface ScenarioResult {
  id: string;
  as_of_date: string;
  currency: string;
  scenario: string;
  delta_eve: number;
  delta_nii: number;
  eve_pct_tier1: number;
  nii_pct_income: number;
  breached: boolean;
  notes: string | null;
  source: string;
}

export const SCENARIO_LABELS: Record<string, string> = {
  parallel_up_200: "Parallel up +200bp",
  parallel_down_200: "Parallel down -200bp",
  steepener: "Steepener",
  flattener: "Flattener",
  short_rate_up: "Short rate up",
  short_rate_down: "Short rate down",
  static: "Static balance sheet",
  worst_of_six: "Worst of six shocks",
};

export const scenarioLabel = (s: string) => SCENARIO_LABELS[s] ?? s;

export type Rag = "green" | "amber" | "red";

/** Higher absolute exposure is always worse for IRRBB measures. */
export const ragForValue = (value: number, amber: number, red: number): Rag => {
  const v = Math.abs(value);
  if (v >= red) return "red";
  if (v >= amber) return "amber";
  return "green";
};

export const ragClass = (rag: Rag) =>
  rag === "red"
    ? "bg-destructive text-destructive-foreground"
    : rag === "amber"
      ? "bg-[hsl(var(--risk-amber))] text-white"
      : "bg-[hsl(var(--risk-green))] text-white";

/* ---------------- gap ladder ---------------- */

export const useGapEntries = () =>
  useQuery({
    queryKey: ["irrbb-gap"],
    queryFn: async () => {
      const { data, error } = await t("irrbb_gap_entries")
        .select("*")
        .order("as_of_date", { ascending: false })
        .order("bucket_order");
      if (error) throw error;
      return data as GapEntry[];
    },
  });

export interface GapRow extends GapEntry {
  gap: number;
  cumulative: number;
  gapPctAssets: number;
}

/** Net + cumulative repricing gap for one currency book, ordered by bucket. */
export const buildLadder = (entries: GapEntry[]): GapRow[] => {
  let cumulative = 0;
  const totalAssets = entries.reduce((s, e) => s + Number(e.rate_sensitive_assets), 0) || 1;
  return [...entries]
    .sort((a, b) => a.bucket_order - b.bucket_order)
    .map((e) => {
      const gap =
        Number(e.rate_sensitive_assets) - Number(e.rate_sensitive_liabilities) + Number(e.off_balance_sheet);
      cumulative += gap;
      return { ...e, gap, cumulative, gapPctAssets: (gap / totalAssets) * 100 };
    });
};

export const useUpsertGapEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<GapEntry> & { id?: string }) => {
      const { id, ...body } = payload;
      const { error } = id
        ? await t("irrbb_gap_entries").update(body).eq("id", id)
        : await t("irrbb_gap_entries").insert(body);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-gap"] });
      toast.success("Gap bucket saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteGapEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("irrbb_gap_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-gap"] });
      toast.success("Gap bucket removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ---------------- limits ---------------- */

export const useIrrbbLimits = () =>
  useQuery({
    queryKey: ["irrbb-limits"],
    queryFn: async () => {
      const { data, error } = await t("irrbb_limits").select("*").order("metric");
      if (error) throw error;
      return data as IrrbbLimit[];
    },
  });

export const useUpsertLimit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<IrrbbLimit> & { id?: string }) => {
      const { id, ...body } = payload;
      const { error } = id
        ? await t("irrbb_limits").update(body).eq("id", id)
        : await t("irrbb_limits").insert(body);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-limits"] });
      toast.success("Limit saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteLimit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("irrbb_limits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-limits"] });
      toast.success("Limit removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ---------------- scenarios ---------------- */

export const useScenarioResults = () =>
  useQuery({
    queryKey: ["irrbb-scenarios"],
    queryFn: async () => {
      const { data, error } = await t("irrbb_scenario_results")
        .select("*")
        .order("as_of_date", { ascending: false })
        .order("scenario");
      if (error) throw error;
      return data as ScenarioResult[];
    },
  });

export const useUpsertScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ScenarioResult> & { id?: string }) => {
      const { id, ...body } = payload;
      const { error } = id
        ? await t("irrbb_scenario_results").update(body).eq("id", id)
        : await t("irrbb_scenario_results").insert(body);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-scenarios"] });
      toast.success("Scenario result saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteScenario = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await t("irrbb_scenario_results").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["irrbb-scenarios"] });
      toast.success("Scenario result removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};
