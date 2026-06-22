import { describe, expect, it } from "vitest";
import { generateMapRows } from "@/lib/maps/generate-map";
import { getMapConfig, MAP_CONFIGS, type PlayerCount } from "@/lib/maps/map-configs";
import type { TerritoryType } from "@/types/campaign";

type MapGenerationInput = Parameters<typeof generateMapRows>[0];

const playerCounts = Object.keys(MAP_CONFIGS).map(Number) as PlayerCount[];
const balancedAccessTypes: TerritoryType[] = [
  "village",
  "mine",
  "dragon",
  "giant",
];

function buildCampaign(playerCount: PlayerCount) {
  const config = getMapConfig(playerCount);

  return {
    id: `campaign-${playerCount}`,
    status: "lobby",
    player_count: playerCount,
    map_width: config.width,
    map_height: config.height,
    map_template: config.template,
  } as MapGenerationInput["campaign"];
}

function buildPlayers(playerCount: PlayerCount) {
  return getMapConfig(playerCount).capitalSlots.map((capitalCode, index) => ({
    id: `player-${index + 1}`,
    status: "active",
    starting_capital_code: capitalCode,
  })) as MapGenerationInput["activePlayers"];
}

function getDistancesFrom(
  startCode: string,
  adjacencies: NonNullable<ReturnType<typeof generateMapRows>["rows"]>["adjacencies"],
) {
  const adjacencyMap = new Map<string, string[]>();

  for (const adjacency of adjacencies) {
    const neighbors = adjacencyMap.get(adjacency.territory_code) ?? [];

    neighbors.push(adjacency.adjacent_territory_code);
    adjacencyMap.set(adjacency.territory_code, neighbors);
  }

  const distances = new Map<string, number>([[startCode, 0]]);
  const queue = [startCode];

  for (let index = 0; index < queue.length; index += 1) {
    const currentCode = queue[index];
    const currentDistance = distances.get(currentCode) ?? 0;

    for (const neighborCode of adjacencyMap.get(currentCode) ?? []) {
      if (distances.has(neighborCode)) continue;

      distances.set(neighborCode, currentDistance + 1);
      queue.push(neighborCode);
    }
  }

  return distances;
}

describe("generateMapRows", () => {
  it.each(playerCounts)(
    "keeps strategic neutral territories balanced for %i players",
    (playerCount) => {
      const config = getMapConfig(playerCount);
      const { rows, error } = generateMapRows({
        campaign: buildCampaign(playerCount),
        activePlayers: buildPlayers(playerCount),
      });

      expect(error).toBeNull();
      expect(rows).not.toBeNull();

      if (!rows) return;

      for (const type of balancedAccessTypes) {
        const typeCodes = rows.territories
          .filter((territory) => territory.type === type)
          .map((territory) => territory.code);
        const nearestDistances = config.capitalSlots.map((capitalCode) => {
          const distances = getDistancesFrom(capitalCode, rows.adjacencies);

          return Math.min(
            ...typeCodes.map((code) => distances.get(code) ?? Infinity),
          );
        });
        const distanceSpread =
          Math.max(...nearestDistances) - Math.min(...nearestDistances);

        expect(distanceSpread).toBeLessThanOrEqual(1);
      }
    },
  );
});
