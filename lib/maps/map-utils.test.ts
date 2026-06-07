import { describe, expect, it } from "vitest";
import {
  generateHexAdjacencies,
  generateOrthogonalAdjacencies,
  generateTerritoryCoordinates,
  getTerritoryCode,
  stableHash,
} from "@/lib/maps/map-utils";

function neighborsOf(
  adjacencies: ReturnType<typeof generateHexAdjacencies>,
  code: string,
) {
  return adjacencies
    .filter((adjacency) => adjacency.territoryCode === code)
    .map((adjacency) => adjacency.adjacentTerritoryCode)
    .sort();
}

describe("map-utils", () => {
  it("converts coordinates to campaign codes", () => {
    expect(getTerritoryCode(1, 1)).toBe("A1");
    expect(getTerritoryCode(5, 4)).toBe("D5");
  });

  it("generates coordinates row by row", () => {
    expect(generateTerritoryCoordinates(2, 2)).toEqual([
      { code: "A1", positionX: 1, positionY: 1 },
      { code: "A2", positionX: 2, positionY: 1 },
      { code: "B1", positionX: 1, positionY: 2 },
      { code: "B2", positionX: 2, positionY: 2 },
    ]);
  });

  it("keeps orthogonal adjacencies to four directions", () => {
    expect(neighborsOf(generateOrthogonalAdjacencies(3, 3), "B2")).toEqual([
      "A2",
      "B1",
      "B3",
      "C2",
    ]);
  });

  it("uses six-neighbor odd/even row hex adjacencies", () => {
    const adjacencies = generateHexAdjacencies(3, 3);

    expect(neighborsOf(adjacencies, "B2")).toEqual([
      "A2",
      "A3",
      "B1",
      "B3",
      "C2",
      "C3",
    ]);
    expect(neighborsOf(adjacencies, "A1")).toEqual(["A2", "B1"]);
  });

  it("keeps stable hashes deterministic", () => {
    expect(stableHash("HexRealm")).toBe(stableHash("HexRealm"));
    expect(stableHash("HexRealm")).not.toBe(stableHash("hexrealm"));
  });
});
