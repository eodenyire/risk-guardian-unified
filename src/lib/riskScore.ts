import type { KRI } from "@/hooks/useKRI";
import type { PrincipalRiskType, RiskAppetite, ContagionLink, Rag } from "@/hooks/useRiskUniverse";
import { networkStats } from "@/hooks/useRiskUniverse";
import { appetiteStatus, AppetiteStatus } from "@/lib/appetite";

const RAG_POINTS: Record<string, number> = { green: 20, amber: 60, red: 90 };

export interface PrtScore {
  prt: PrincipalRiskType;
  kris: KRI[];
  kriScore: number | null;
  appetite: { a: RiskAppetite; s: AppetiteStatus }[];
  appetiteRag: Rag;
  connectedness: number; // 0-100
  score: number | null; // 0-100 composite
  rag: Rag;
}

export const scoreRag = (s: number | null): Rag =>
  s === null ? "grey" : s >= 65 ? "red" : s >= 40 ? "amber" : "green";

/** Composite PRT score: 70% KRI performance, 30% interconnectedness. */
export const buildPrtScores = (
  prts: PrincipalRiskType[], kris: KRI[], appetite: RiskAppetite[], links: ContagionLink[],
): PrtScore[] => {
  const stats = networkStats(links);
  const maxStrength = Math.max(0.0001, ...[...stats.values()].map((v) => v.inStrength + v.outStrength));
  return prts.map((prt) => {
    const pk = kris.filter((k) => k.risk_type_id === prt.id);
    const kriScore = pk.length ? pk.reduce((t, k) => t + (RAG_POINTS[k.status] ?? 20), 0) / pk.length : null;
    const st = stats.get(prt.id);
    const connectedness = st ? Math.round(((st.inStrength + st.outStrength) / maxStrength) * 100) : 0;
    const ap = appetite.filter((a) => a.risk_type_id === prt.id).map((a) => ({ a, s: appetiteStatus(a, kris) }));
    const order: Rag[] = ["red", "amber", "green"];
    const appetiteRag = order.find((r) => ap.some((x) => x.s.rag === r)) ?? "grey";
    const score = kriScore === null ? null : Math.round(kriScore * 0.7 + connectedness * 0.3);
    return { prt, kris: pk, kriScore, appetite: ap, appetiteRag, connectedness, score, rag: scoreRag(score) };
  });
};

export type ReviewState = "overdue" | "due_soon" | "current" | "unscheduled";
export const reviewState = (d: string | null, today = new Date()): ReviewState => {
  if (!d) return "unscheduled";
  const due = new Date(`${d}T00:00:00`);
  if (!Number.isFinite(due.getTime())) return "unscheduled";
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((due.getTime() - start.getTime()) / 86400000);
  return days < 0 ? "overdue" : days <= 30 ? "due_soon" : "current";
};
