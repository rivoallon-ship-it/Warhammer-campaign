import { describe, expect, it } from "vitest";
import { MAP_CONFIGS, type PlayerCount } from "@/lib/maps/map-configs";
import {
  expandNonCapitalDistribution,
  getTerritoryDistribution,
  getTerritoryDistributionTotal,
} from "@/lib/maps/territory-distribution";

const playerCounts = Object.keys(MAP_CONFIGS).map(Number) as PlayerCount[];

describe("territory-distribution", () => {
  it.each(playerCounts)("matches map size for %i players", (playerCount) => {
    const config = MAP_CONFIGS[playerCount];
    const distribution = getTerritoryDistribution(playerCount);

    expect(getTerritoryDistributionTotal(distribution)).toBe(
      config.width * config.height,
    );
    expect(distribution.capital).toBe(playerCount);
  });

  it("expands non-capital territory types in deterministic order", () => {
    const expandedTypes = expandNonCapitalDistribution(getTerritoryDistribution(2));

    expect(expandedTypes).toHaveLength(18);
    expect(expandedTypes.slice(0, 4)).toEqual([
      "dragon",
      "dragon",
      "giant",
      "giant",
    ]);
    expect(expandedTypes).not.toContain("capital");
  });
});
