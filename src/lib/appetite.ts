import type { KRI } from "@/hooks/useKRI";
import type { RiskAppetite, Rag } from "@/hooks/useRiskUniverse";

export interface AppetiteStatus {
  /** KRIs mapped to this statement */
  kris: KRI[];
  /** Worst-performing KRI driving the status */
  driver: KRI | null;
  /** Live value of the driving KRI */
  liveValue: number | null;
  /** How much of the tolerance limit is consumed, in % */
  utilisation: number | null;
  rag: Rag;
  /** 0-4 band index used by the heat map */
  band: number;
}

export const UTILISATION_BANDS = [
  { label: "0-50%", max: 50 },
  { label: "50-75%", max: 75 },
  { label: "75-90%", max: 90 },
  { label: "90-100%", max: 100 },
  { label: "Over limit", max: Infinity },
];

export const bandFor = (utilisation: number) =>
  UTILISATION_BANDS.findIndex((b) => utilisation <= b.max) === -1
    ? UTILISATION_BANDS.length - 1
    : UTILISATION_BANDS.findIndex((b) => utilisation <= b.max);

export const bandRag = (band: number): Rag =>
  band >= 4 ? "red" : band >= 2 ? "amber" : "green";

/** Consumption of the tolerance limit by a single KRI, in %. */
export const kriUtilisation = (k: KRI, tolerance: number): number | null => {
  const v = Number(k.current_value);
  if (!Number.isFinite(v) || !Number.isFinite(tolerance) || tolerance === 0) return null;
  return k.direction === "lower_is_worse"
    ? (tolerance / v) * 100
    : (v / tolerance) * 100;
};

/**
 * Score an appetite statement against the live KRI population.
 * Sub-type statements bind to that sub type's KRIs; otherwise the whole PRT.
 */
export const appetiteStatus = (a: RiskAppetite, allKris: KRI[]): AppetiteStatus => {
  const kris = a.risk_sub_type_id
    ? allKris.filter((k) => k.risk_sub_type_id === a.risk_sub_type_id)
    : allKris.filter((k) => k.risk_type_id === a.risk_type_id);

  const tolerance = a.tolerance_limit === null ? NaN : Number(a.tolerance_limit);

  let driver: KRI | null = null;
  let utilisation: number | null = null;

  kris.forEach((k) => {
    const u = kriUtilisation(k, tolerance);
    if (u === null) return;
    if (utilisation === null || u > utilisation) {
      utilisation = u;
      driver = k;
    }
  });

  // Without a usable tolerance, fall back to the worst live KRI RAG.
  if (utilisation === null) {
    const rag: Rag = kris.some((k) => k.status === "red")
      ? "red"
      : kris.some((k) => k.status === "amber")
      ? "amber"
      : kris.length
      ? "green"
      : "grey";
    return { kris, driver: null, liveValue: null, utilisation: null, rag, band: -1 };
  }

  const band = bandFor(utilisation);
  return {
    kris,
    driver,
    liveValue: driver ? Number((driver as KRI).current_value) : null,
    utilisation,
    rag: bandRag(band),
    band,
  };
};
