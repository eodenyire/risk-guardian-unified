import { describe, expect, it, vi } from "vitest";
vi.mock("@/hooks/useRiskUniverse", () => ({ networkStats: () => new Map() }));
import { reviewState, buildPrtScores } from "@/lib/riskScore";
import type { PrincipalRiskType } from "@/hooks/useRiskUniverse";
import type { KRI } from "@/hooks/useKRI";

describe("appetite review dates", () => {
  const today = new Date(2026, 9, 19, 15);
  it("keeps a review due today due soon rather than overdue", () => {
    expect(reviewState("2026-10-19", today)).toBe("due_soon");
  });
  it("marks past calendar dates overdue", () => {
    expect(reviewState("2026-10-18", today)).toBe("overdue");
  });
  it("includes day 30 in the review window", () => {
    expect(reviewState("2026-11-18", today)).toBe("due_soon");
    expect(reviewState("2026-11-19", today)).toBe("current");
  });
  it("leaves absent or invalid dates unscheduled", () => {
    expect(reviewState(null, today)).toBe("unscheduled");
    expect(reviewState("invalid", today)).toBe("unscheduled");
  });
});

describe("aggregate PRT scores", () => {
  const prt = { id: "credit" } as PrincipalRiskType;
  it("does not invent a score when no indicators exist", () => {
    expect(buildPrtScores([prt], [], [], [])[0].score).toBeNull();
  });
  it("aggregates live indicator status into the central model", () => {
    const kri = { risk_type_id: "credit", status: "red" } as KRI;
    expect(buildPrtScores([prt], [kri], [], [])[0].score).toBe(63);
  });
});