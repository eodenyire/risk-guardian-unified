/**
 * Specialist configuration per Principal Risk Type.
 * Drives the bucketed "gap / exposure" table inside each PRT module so credit,
 * market, liquidity, operational and capital each read in their own language
 * while sharing one storage model (public.prt_gap_entries).
 */
export interface SpecialistConfig {
  /** Tab + card title */
  title: string;
  /** Short explanation shown under the title */
  blurb: string;
  /** Default dimension stored on new rows */
  dimension: string;
  bucketLabel: string;
  exposureLabel: string;
  offsetLabel: string;
  netLabel: string;
  limitLabel: string;
  unit: string;
  /** true -> net can legitimately be negative (a gap); false -> net is a residual */
  signedNet: boolean;
}

const GENERIC: SpecialistConfig = {
  title: "Exposure Ladder",
  blurb: "Bucketed exposures, offsets and limits for this risk type.",
  dimension: "band",
  bucketLabel: "Bucket",
  exposureLabel: "Exposure",
  offsetLabel: "Offset",
  netLabel: "Net",
  limitLabel: "Limit",
  unit: "KES m",
  signedNet: true,
};

export const SPECIALIST: Record<string, SpecialistConfig> = {
  CR: {
    title: "IFRS 9 Staging & Portfolio Quality",
    blurb: "Gross exposure against expected credit loss provisions and concentration limits by stage.",
    dimension: "stage",
    bucketLabel: "Stage",
    exposureLabel: "Gross exposure",
    offsetLabel: "ECL provision",
    netLabel: "Net exposure",
    limitLabel: "Exposure limit",
    unit: "KES m",
    signedNet: false,
  },
  MR: {
    title: "Trading Desk VaR Utilisation",
    blurb: "One-day 99% VaR by desk against approved trading limits, net of hedges.",
    dimension: "desk",
    bucketLabel: "Desk",
    exposureLabel: "VaR used",
    offsetLabel: "Hedge offset",
    netLabel: "Net VaR",
    limitLabel: "VaR limit",
    unit: "KES m",
    signedNet: false,
  },
  LR: {
    title: "Contractual Maturity Gap Ladder",
    blurb: "Cash inflows against outflows per time bucket, with cumulative liquidity gap and board limits.",
    dimension: "maturity",
    bucketLabel: "Time bucket",
    exposureLabel: "Inflows",
    offsetLabel: "Outflows",
    netLabel: "Net gap",
    limitLabel: "Gap limit",
    unit: "KES m",
    signedNet: true,
  },
  OR: {
    title: "Loss Event Register by Basel Event Type",
    blurb: "Gross operational losses year to date against recoveries and the loss appetite envelope.",
    dimension: "band",
    bucketLabel: "Event type",
    exposureLabel: "Gross loss",
    offsetLabel: "Recoveries",
    netLabel: "Net loss",
    limitLabel: "Loss appetite",
    unit: "KES m",
    signedNet: false,
  },
  CAP: {
    title: "Risk Weighted Asset Composition",
    blurb: "RWA by risk pillar against the internal capital planning ceiling.",
    dimension: "band",
    bucketLabel: "RWA pillar",
    exposureLabel: "RWA",
    offsetLabel: "Deductions",
    netLabel: "Net RWA",
    limitLabel: "RWA ceiling",
    unit: "KES m",
    signedNet: false,
  },
  CTY: {
    title: "Cross-Border Exposure by Country",
    blurb: "Gross cross-border exposure against risk mitigants (guarantees, insurance) and board country limits.",
    dimension: "country", bucketLabel: "Country", exposureLabel: "Gross exposure", offsetLabel: "Mitigants",
    netLabel: "Net exposure", limitLabel: "Country limit", unit: "KES m", signedNet: false,
  },
  STR: {
    title: "Strategic Plan Delivery by Business Line",
    blurb: "Budgeted revenue against actuals year to date, with shortfall tolerance per business line.",
    dimension: "band", bucketLabel: "Business line", exposureLabel: "Budget", offsetLabel: "Actual",
    netLabel: "Shortfall", limitLabel: "Tolerance", unit: "KES m", signedNet: true,
  },
  CYB: {
    title: "Vulnerability Remediation Ladder",
    blurb: "Open vulnerabilities by severity against those remediated, versus the open-count tolerance.",
    dimension: "band", bucketLabel: "Severity", exposureLabel: "Identified", offsetLabel: "Remediated",
    netLabel: "Open", limitLabel: "Max open", unit: "count", signedNet: false,
  },
  FRD: {
    title: "Fraud Losses by Channel",
    blurb: "Attempted/actual fraud losses by channel against recoveries and the loss appetite.",
    dimension: "band", bucketLabel: "Channel", exposureLabel: "Gross loss", offsetLabel: "Recovered",
    netLabel: "Net loss", limitLabel: "Loss appetite", unit: "KES m", signedNet: false,
  },
  CMP: {
    title: "Regulatory Findings by Regulator",
    blurb: "Findings raised against findings closed, versus the open-findings tolerance per regulator.",
    dimension: "band", bucketLabel: "Regulator", exposureLabel: "Findings raised", offsetLabel: "Closed",
    netLabel: "Open", limitLabel: "Max open", unit: "count", signedNet: false,
  },
  CND: {
    title: "Customer Complaints by Theme",
    blurb: "Complaints received against complaints resolved within SLA, versus the backlog tolerance.",
    dimension: "band", bucketLabel: "Theme", exposureLabel: "Received", offsetLabel: "Resolved",
    netLabel: "Backlog", limitLabel: "Max backlog", unit: "count", signedNet: false,
  },
  MDL: {
    title: "Model Inventory Validation Status",
    blurb: "Models in use by tier against those with current independent validation.",
    dimension: "band", bucketLabel: "Model tier", exposureLabel: "Models in use", offsetLabel: "Validated",
    netLabel: "Unvalidated", limitLabel: "Max unvalidated", unit: "count", signedNet: false,
  },
};

export const specialistFor = (code?: string | null): SpecialistConfig =>
  (code && SPECIALIST[code.toUpperCase()]) || GENERIC;

export const hasSpecialist = (code?: string | null) =>
  Boolean(code && SPECIALIST[code.toUpperCase()]);
