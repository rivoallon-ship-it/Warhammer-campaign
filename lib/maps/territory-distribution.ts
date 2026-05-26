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
    dragon: 1,
    giant: 1,
    village: 1,
    ruins: 1,
    fort: 1,
    magic_tower: 0,
    wild: 2,
  },
  3: {
    capital: 3,
    dragon: 1,
    giant: 1,
    village: 2,
    ruins: 2,
    fort: 1,
    magic_tower: 0,
    wild: 2,
  },
  4: {
    capital: 4,
    dragon: 2,
    giant: 2,
    village: 2,
    ruins: 2,
    fort: 1,
    magic_tower: 1,
    wild: 2,
  },
  5: {
    capital: 5,
    dragon: 2,
    giant: 2,
    village: 3,
    ruins: 3,
    fort: 2,
    magic_tower: 1,
    wild: 2,
  },
  6: {
    capital: 6,
    dragon: 3,
    giant: 3,
    village: 3,
    ruins: 3,
    fort: 2,
    magic_tower: 2,
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
