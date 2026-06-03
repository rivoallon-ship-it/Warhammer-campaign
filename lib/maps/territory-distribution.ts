import type { PlayerCount } from "@/lib/maps/map-configs";
import type { TerritoryType } from "@/types/campaign";

export type TerritoryDistribution = Record<TerritoryType, number>;

export const TERRITORY_TYPE_ORDER: TerritoryType[] = [
  "dragon",
  "giant",
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
    village: 4,
    ruins: 4,
    fort: 2,
    magic_tower: 2,
    wild: 2,
  },
  3: {
    capital: 3,
    dragon: 3,
    giant: 3,
    village: 6,
    ruins: 5,
    fort: 3,
    magic_tower: 3,
    wild: 4,
  },
  4: {
    capital: 4,
    dragon: 4,
    giant: 4,
    village: 7,
    ruins: 6,
    fort: 4,
    magic_tower: 3,
    wild: 3,
  },
  5: {
    capital: 5,
    dragon: 5,
    giant: 5,
    village: 10,
    ruins: 9,
    fort: 5,
    magic_tower: 5,
    wild: 4,
  },
  6: {
    capital: 6,
    dragon: 6,
    giant: 6,
    village: 11,
    ruins: 10,
    fort: 6,
    magic_tower: 6,
    wild: 3,
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
