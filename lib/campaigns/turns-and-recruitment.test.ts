import { describe, expect, it } from "vitest";
import {
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
