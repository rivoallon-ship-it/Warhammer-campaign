export type LegendaryUnitType = "dragon" | "giant";

export const LEGENDARY_RECRUITMENT_COSTS: Record<LegendaryUnitType, number> = {
  dragon: 10,
  giant: 8,
};

export function getLegendaryRecruitmentCost(unitType: LegendaryUnitType) {
  return LEGENDARY_RECRUITMENT_COSTS[unitType];
}

export function getLegendaryUnitLabel(unitType: string) {
  if (unitType === "dragon") return "Dragon";
  if (unitType === "giant") return "Géant";

  return "Unité légendaire";
}

export function getLegendaryRecruitsSummary(
  dragonRecruits: number,
  giantRecruits: number,
) {
  const recruits: string[] = [];

  if (dragonRecruits > 0) {
    recruits.push(`${dragonRecruits} Dragon${dragonRecruits > 1 ? "s" : ""}`);
  }

  if (giantRecruits > 0) {
    recruits.push(`${giantRecruits} Géant${giantRecruits > 1 ? "s" : ""}`);
  }

  return recruits.length ? recruits.join(", ") : null;
}

export function isLegendaryUnitType(value: string): value is LegendaryUnitType {
  return value === "dragon" || value === "giant";
}
