import { describe, expect, it } from "vitest";
import {
  getEndTurnGloryIncome,
  getNeutralConquestDifficultyLabel,
  getNeutralConquestThreshold,
  getPlayerTerritoryRuleStats,
  getTerritoryControlGloryIncome,
  getVillageArmyBonus,
  hasDefensiveArmyPointsBonus,
  isLegendaryTerritory,
} from "@/lib/campaigns/territory-rules";

describe("territory-rules", () => {
  it("caps village army bonus at 200 points", () => {
    expect(getVillageArmyBonus(-1)).toBe(0);
    expect(getVillageArmyBonus(1)).toBe(100);
    expect(getVillageArmyBonus(2)).toBe(200);
    expect(getVillageArmyBonus(4)).toBe(200);
  });

  it("calculates end-turn glory from territory control and mines", () => {
    expect(getTerritoryControlGloryIncome(0)).toBe(0);
    expect(getTerritoryControlGloryIncome(2)).toBe(0);
    expect(getTerritoryControlGloryIncome(3)).toBe(1);
    expect(getTerritoryControlGloryIncome(8)).toBe(2);
    expect(getEndTurnGloryIncome({
      controlledCount: 7,
      villageCount: 2,
      mineCount: 3,
    })).toBe(5);
  });

  it("applies tactical neutral conquest thresholds", () => {
    expect(getNeutralConquestThreshold("wild", 1)).toBe(3);
    expect(getNeutralConquestThreshold("wild", 2)).toBe(2);
    expect(getNeutralConquestThreshold("wild", 3)).toBeNull();
    expect(getNeutralConquestThreshold("dragon", 1)).toBe(4);
    expect(getNeutralConquestThreshold("giant", 1)).toBe(4);
    expect(getNeutralConquestThreshold("dragon", 2)).toBe(2);
    expect(getNeutralConquestThreshold("giant", 3)).toBeNull();
  });

  it("labels legendary neutral conquests with their glory bonus", () => {
    expect(getNeutralConquestDifficultyLabel("dragon", 1)).toContain(
      "+3 Gloire",
    );
    expect(getNeutralConquestDifficultyLabel("wild", 3)).toContain(
      "Conquête automatique",
    );
  });

  it("recognizes defensive army point bonuses from battle text", () => {
    expect(hasDefensiveArmyPointsBonus("Fortification : défenseur +200 points d'armée.")).toBe(true);
    expect(hasDefensiveArmyPointsBonus("Tour magique : magicien niveau 1.")).toBe(false);
    expect(hasDefensiveArmyPointsBonus(null)).toBe(false);
  });

  it("groups player territory rule stats", () => {
    const stats = getPlayerTerritoryRuleStats([
      { type: "capital", owner_campaign_player_id: "player-a" },
      { type: "village", owner_campaign_player_id: "player-a" },
      { type: "mine", owner_campaign_player_id: "player-a" },
      { type: "mine", owner_campaign_player_id: "player-b" },
      { type: "wild", owner_campaign_player_id: null },
    ]);

    expect(stats.get("player-a")).toEqual({
      controlledCount: 3,
      villageCount: 1,
      mineCount: 1,
    });
    expect(stats.get("player-b")).toEqual({
      controlledCount: 1,
      villageCount: 0,
      mineCount: 1,
    });
  });

  it("identifies legendary territories", () => {
    expect(isLegendaryTerritory("dragon")).toBe(true);
    expect(isLegendaryTerritory("giant")).toBe(true);
    expect(isLegendaryTerritory("wild")).toBe(false);
  });
});
