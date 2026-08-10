import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type PrtCategory = "financial" | "non_financial";
export type Rag = "green" | "amber" | "red" | "grey";

export interface PrincipalRiskType {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string | null;
  prt_category: PrtCategory;
  risk_level: string;
  risk_score: number;
  trend: string;
  owner: string | null;
  display_order: number;
}

export interface RiskSubType {
  id: string;
  risk_type_id: string;
  name: string;
  code: string | null;
  description: string | null;
  owner: string | null;
  inherent_rating: string;
  residual_rating: string | null;
  status: string;
  display_order: number;
  created_at: string;
  updated_at: string;
  risk_types?: { name: string; prt_category: PrtCategory } | null;
}

export interface RiskAppetite {
  id: string;
  risk_type_id: string | null;
  risk_sub_type_id: string | null;
  statement: string;
  appetite_level: string;
  tolerance_limit: number | null;
  metric_unit: string | null;
  escalation_trigger: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_frequency: string;
  next_review_date: string | null;
  status: string;
  risk_types?: { name: string } | null;
  risk_sub_types?: { name: string } | null;
}

export interface KriObservation {
  id: string;
  kri_id: string;
  observed_at: string;
  value: number;
  rag: Rag | null;
  source: string;
  notes: string | null;
  breached: boolean;
}

export interface ContagionLink {
  id: string;
  source_risk_type_id: string;
  target_risk_type_id: string;
  strength: number;
  lag_days: number;
  direction: string;
  method: "manual" | "inferred";
  confidence: number | null;
  rationale: string | null;
  last_evaluated_at: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromTable = (t: string) => (supabase as any).from(t);

export const RAG_ORDER: Record<Rag, number> = { red: 3, amber: 2, green: 1, grey: 0 };

export const ragToken = (rag: Rag) =>
  rag === "red" ? "hsl(var(--risk-red))"
  : rag === "amber" ? "hsl(var(--risk-amber))"
  : rag === "green" ? "hsl(var(--risk-green))"
  : "hsl(var(--risk-grey))";

export const worstRag = (list: Rag[]): Rag =>
  list.reduce<Rag>((acc, r) => (RAG_ORDER[r] > RAG_ORDER[acc] ? r : acc), "grey");

/* ------------------------------------------------------------------ */
/* Principal risk types                                                */
/* ------------------------------------------------------------------ */

export const usePrincipalRiskTypes = () =>
  useQuery({
    queryKey: ["prts"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_types")
        .select("*")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data as PrincipalRiskType[];
    },
  });

/* ------------------------------------------------------------------ */
/* Sub types                                                           */
/* ------------------------------------------------------------------ */

export const useRiskSubTypes = () =>
  useQuery({
    queryKey: ["risk-sub-types"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_sub_types")
        .select("*, risk_types(name, prt_category)")
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data as RiskSubType[];
    },
  });

export const useUpsertSubType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<RiskSubType> & { id?: string }) => {
      const { id, risk_types: _rt, created_at: _c, updated_at: _u, ...body } = payload;
      if (id) {
        const { error } = await fromTable("risk_sub_types").update(body).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await fromTable("risk_sub_types").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-sub-types"] });
      toast.success("Risk sub type saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteSubType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("risk_sub_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-sub-types"] });
      toast.success("Risk sub type deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ------------------------------------------------------------------ */
/* Appetite                                                            */
/* ------------------------------------------------------------------ */

export const useRiskAppetite = () =>
  useQuery({
    queryKey: ["risk-appetite"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_appetite")
        .select("*, risk_types(name), risk_sub_types(name)")
        .order("created_at");
      if (error) throw error;
      return data as RiskAppetite[];
    },
  });

export const useUpsertAppetite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<RiskAppetite> & { id?: string }) => {
      const { id, risk_types: _a, risk_sub_types: _b, ...body } = payload;
      if (id) {
        const { error } = await fromTable("risk_appetite").update(body).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await fromTable("risk_appetite").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-appetite"] });
      toast.success("Appetite statement saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteAppetite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("risk_appetite").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-appetite"] });
      toast.success("Appetite statement deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ------------------------------------------------------------------ */
/* Observations                                                        */
/* ------------------------------------------------------------------ */

export const useObservations = (kriId?: string) =>
  useQuery({
    queryKey: ["kri-observations", kriId ?? "all"],
    queryFn: async () => {
      let q = fromTable("kri_observations").select("*").order("observed_at", { ascending: true });
      if (kriId) q = q.eq("kri_id", kriId);
      const { data, error } = await q.limit(2000);
      if (error) throw error;
      return data as KriObservation[];
    },
  });

export const useRecordObservation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { kri_id: string; value: number; observed_at?: string; source?: string; notes?: string }) => {
      const { error } = await fromTable("kri_observations").insert({
        kri_id: payload.kri_id,
        value: payload.value,
        observed_at: payload.observed_at ?? new Date().toISOString(),
        source: payload.source ?? "manual",
        notes: payload.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kri-observations"] });
      qc.invalidateQueries({ queryKey: ["kris"] });
      toast.success("Observation recorded — RAG recalculated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ------------------------------------------------------------------ */
/* Contagion                                                           */
/* ------------------------------------------------------------------ */

export const useContagionLinks = () =>
  useQuery({
    queryKey: ["contagion-links"],
    queryFn: async () => {
      const { data, error } = await fromTable("risk_contagion_links").select("*");
      if (error) throw error;
      return data as ContagionLink[];
    },
  });

export const useUpsertContagionLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ContagionLink> & { id?: string }) => {
      const { id, ...body } = payload;
      if (id) {
        const { error } = await fromTable("risk_contagion_links").update(body).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await fromTable("risk_contagion_links").insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagion-links"] });
      toast.success("Transmission link saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

export const useDeleteContagionLink = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable("risk_contagion_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contagion-links"] });
      toast.success("Transmission link removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
};

/* ------------------------------------------------------------------ */
/* Contagion propagation model                                         */
/* ------------------------------------------------------------------ */

export interface PropagationResult {
  byRisk: Record<string, { base: number; propagated: number; total: number; wave: number }>;
  waves: { wave: number; nodes: { id: string; delta: number }[] }[];
}

/**
 * Cascade a shock from one or more origin risks through the transmission
 * network. Each wave attenuates by `damping`; contribution to a target is
 * source impact x link strength. Values are 0-100 severity units.
 */
export const propagateShock = (
  originIds: string[],
  shock: number,
  links: ContagionLink[],
  baseScores: Record<string, number>,
  opts: { waves?: number; damping?: number; minTransmission?: number } = {}
): PropagationResult => {
  const waves = opts.waves ?? 3;
  const damping = opts.damping ?? 0.75;
  const minTransmission = opts.minTransmission ?? 0.5;

  const byRisk: PropagationResult["byRisk"] = {};
  Object.entries(baseScores).forEach(([id, base]) => {
    byRisk[id] = { base, propagated: 0, total: base, wave: originIds.includes(id) ? 0 : -1 };
  });
  originIds.forEach((id) => {
    if (!byRisk[id]) byRisk[id] = { base: 0, propagated: 0, total: 0, wave: 0 };
    byRisk[id].propagated += shock;
    byRisk[id].wave = 0;
  });

  const outgoing = new Map<string, ContagionLink[]>();
  links.forEach((l) => {
    const arr = outgoing.get(l.source_risk_type_id) ?? [];
    arr.push(l);
    outgoing.set(l.source_risk_type_id, arr);
  });

  let frontier = new Map<string, number>(originIds.map((id) => [id, shock]));
  const waveLog: PropagationResult["waves"] = [{ wave: 0, nodes: originIds.map((id) => ({ id, delta: shock })) }];

  for (let w = 1; w <= waves; w++) {
    const next = new Map<string, number>();
    frontier.forEach((amount, sourceId) => {
      (outgoing.get(sourceId) ?? []).forEach((link) => {
        const sign = link.direction === "negative" ? -1 : 1;
        const delta = amount * Number(link.strength) * damping * sign;
        if (Math.abs(delta) < minTransmission) return;
        next.set(link.target_risk_type_id, (next.get(link.target_risk_type_id) ?? 0) + delta);
      });
    });
    if (next.size === 0) break;
    const nodes: { id: string; delta: number }[] = [];
    next.forEach((delta, id) => {
      if (!byRisk[id]) byRisk[id] = { base: 0, propagated: 0, total: 0, wave: w };
      byRisk[id].propagated += delta;
      if (byRisk[id].wave < 0) byRisk[id].wave = w;
      nodes.push({ id, delta });
    });
    waveLog.push({ wave: w, nodes: nodes.sort((a, b) => b.delta - a.delta) });
    frontier = next;
  }

  Object.values(byRisk).forEach((v) => {
    v.total = Math.max(0, Math.min(100, v.base + v.propagated));
  });

  return { byRisk, waves: waveLog };
};

/** Degree / centrality statistics for the transmission network. */
export const networkStats = (links: ContagionLink[]) => {
  const stats = new Map<string, { outDegree: number; inDegree: number; outStrength: number; inStrength: number }>();
  const touch = (id: string) => {
    if (!stats.has(id)) stats.set(id, { outDegree: 0, inDegree: 0, outStrength: 0, inStrength: 0 });
    return stats.get(id)!;
  };
  links.forEach((l) => {
    const s = touch(l.source_risk_type_id);
    const t = touch(l.target_risk_type_id);
    s.outDegree += 1;
    s.outStrength += Number(l.strength);
    t.inDegree += 1;
    t.inStrength += Number(l.strength);
  });
  return stats;
};
