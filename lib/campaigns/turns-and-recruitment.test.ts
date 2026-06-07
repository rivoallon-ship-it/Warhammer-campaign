import { describe, expect, it } from "vitest";
import {
  DRAGON_ARMY_POINTS,
  GIANT_ARMY_POINTS,
  getLegendaryCommitmentArmyPoints,
  getLegendaryRecruitmentCost,
  getLegendaryRecruitsSummary,
  getLegendaryUnitLabel,
  isLegendaryUnitType,
} from "@/lib/campaigns/recruitment-rules";
import { getArmyBasePoints } from "@/lib/campaigns/turns";

describe("turns", () => {
  it("starts at 400 army points and caps at 2000", () => {
    expect(getArmyBasePoints(1)).toBe(400);
    expect(getArmyBasePoints(2)).toBe(600);
    expect(getArmyBasePoints(9)).toBe(2000);
    expect(getArmyBasePoints(20)).toBe(2000);
  });
});

describe("recruitment-rules", () => {
  it("keeps legendary recruitment costs balanced by points", () => {
    expect(getLegendaryRecruitmentCost("dragon")).toBe(10);
    expect(getLegendaryRecruitmentCost("giant")).toBe(8);
    expect(DRAGON_ARMY_POINTS).toBe(160);
    expect(GIANT_ARMY_POINTS).toBe(120);
  });

  it("counts only committed legendary recruits as battle army points", () => {
    expect(getLegendaryCommitmentArmyPoints(0, 0)).toBe(0);
    expect(getLegendaryCommitmentArmyPoints(1, 0)).toBe(160);
    expect(getLegendaryCommitmentArmyPoints(1, 1)).toBe(280);
    expect(getLegendaryCommitmentArmyPoints(-1, 2)).toBe(240);
  });

  it("labels legendary units", () => {
    expect(getLegendaryUnitLabel("dragon")).toBe("Dragon");
    expect(getLegendaryUnitLabel("giant")).toBe("Géant");
    expect(getLegendaryUnitLabel("unknown")).toBe("Unité légendaire");
  });

  it("summarizes owned legendary recruits", () => {
    expect(getLegendaryRecruitsSummary(0, 0)).toBeNull();
    expect(getLegendaryRecruitsSummary(1, 0)).toBe("1 Dragon");
    expect(getLegendaryRecruitsSummary(2, 1)).toBe("2 Dragons, 1 Géant");
  });

  it("validates recruitable legendary unit types", () => {
    expect(isLegendaryUnitType("dragon")).toBe(true);
    expect(isLegendaryUnitType("giant")).toBe(true);
    expect(isLegendaryUnitType("wild")).toBe(false);
  });
});
