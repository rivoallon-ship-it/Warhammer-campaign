import type { PlayerCount } from "@/lib/maps/map-configs";
import type { TerritoryType } from "@/types/campaign";

export type TerritoryDistribution = Record<TerritoryType, number>;

export const TERRITORY_TYPE_ORDER: TerritoryType[] = [
  "dragon",
  "giant",
  "mine",
  "village",
  "ruins",
  "fort",
  "magic_tower",
  "wild",
];

export const TERRITORY_DISTRIBUTIONS: Record<PlayerCount, TerritoryDistribution> = {
  2: {
    capital: 2,
    dragon: 2,
    giant: 2,
    mine: 2,
    village: 3,
    ruins: 3,
    fort: 2,
    magic_tower: 2,
    wild: 2,
  },
  3: {
    capital: 3,
    dragon: 3,
    giant: 3,
    mine: 3,
    village: 5,
    ruins: 4,
    fort: 3,
    magic_tower: 3,
    wild: 3,
  },
  4: {
    capital: 4,
    dragon: 4,
    giant: 4,
    mine: 4,
    village: 6,
    ruins: 5,
    fort: 4,
    magic_tower: 3,
    wild: 1,
  },
  5: {
    capital: 5,
    dragon: 5,
    giant: 5,
    mine: 5,
    village: 8,
    ruins: 8,
    fort: 5,
    magic_tower: 5,
    wild: 2,
  },
  6: {
    capital: 6,
    dragon: 6,
    giant: 6,
    mine: 6,
    village: 9,
    ruins: 8,
    fort: 6,
    magic_tower: 5,
    wild: 2,
  },
};

export function getTerritoryDistribution(playerCount: PlayerCount) {
  return TERRITORY_DISTRIBUTIONS[playerCount];
}

export function getTerritoryDistributionTotal(
  distribution: TerritoryDistribution,
) {
  return Object.values(distribution).reduce((total, count) => total + count, 0);
}

export function expandNonCapitalDistribution(
  distribution: TerritoryDistribution,
) {
  return TERRITORY_TYPE_ORDER.flatMap((type) =>
    Array.from({ length: distribution[type] }, () => type),
  );
}
