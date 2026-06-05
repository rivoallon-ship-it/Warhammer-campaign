export const LEGENDARY_RECRUITMENT_COST = 10;

export type LegendaryUnitType = "dragon" | "giant";

export function getLegendaryUnitLabel(unitType: string) {
  if (unitType === "dragon") return "Dragon";
  if (unitType === "giant") return "Géant";

  return "Unité légendaire";
}

export function isLegendaryUnitType(value: string): value is LegendaryUnitType {
  return value === "dragon" || value === "giant";
}
