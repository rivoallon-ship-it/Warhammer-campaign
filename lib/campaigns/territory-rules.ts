export const VILLAGE_ARMY_BONUS = 100;
export const MAX_VILLAGE_ARMY_BONUS = 200;
export const DEFENSIVE_ARMY_BONUS = 200;
export const LEGENDARY_CONQUEST_GLORY_BONUS = 3;

export type TerritoryRuleSource = {
  type: string;
  owner_campaign_player_id: string | null;
};

export type PlayerTerritoryRuleStats = {
  controlledCount: number;
  villageCount: number;
  mineCount: number;
};

export function isLegendaryTerritory(type: string) {
  return type === "dragon" || type === "giant";
}

export function getVillageArmyBonus(villageCount: number) {
  return Math.min(
    Math.max(villageCount, 0) * VILLAGE_ARMY_BONUS,
    MAX_VILLAGE_ARMY_BONUS,
  );
}

export function getTerritoryControlGloryIncome(controlledCount: number) {
  return Math.floor(Math.max(controlledCount, 0) / 3);
}

export function getEndTurnGloryIncome(stats: PlayerTerritoryRuleStats) {
  return getTerritoryControlGloryIncome(stats.controlledCount) + stats.mineCount;
}

export function getNeutralConquestThreshold(
  territoryType: string,
  adjacentControlledCount: number,
) {
  if (adjacentControlledCount >= 3) return null;
  if (adjacentControlledCount >= 2) return 2;
  if (isLegendaryTerritory(territoryType)) return 4;

  return 3;
}

export function getNeutralConquestDifficultyLabel(
  territoryType: string,
  adjacentControlledCount: number,
) {
  const threshold = getNeutralConquestThreshold(
    territoryType,
    adjacentControlledCount,
  );
  const legendarySuffix = isLegendaryTerritory(territoryType)
    ? ` En cas de réussite : +${LEGENDARY_CONQUEST_GLORY_BONUS} Gloire.`
    : "";

  if (threshold === null) {
    return `Conquête automatique : tu contrôles 3 territoires adjacents ou plus.${legendarySuffix}`;
  }

  return `Conquête sur ${threshold}+ : tu contrôles ${adjacentControlledCount} territoire${
    adjacentControlledCount > 1 ? "s" : ""
  } adjacent${adjacentControlledCount > 1 ? "s" : ""}.${legendarySuffix}`;
}

export function hasDefensiveArmyPointsBonus(defenderBonus?: string | null) {
  return Boolean(defenderBonus?.includes("+200 points"));
}

export function getPlayerTerritoryRuleStats(
  territories: TerritoryRuleSource[],
) {
  const statsByPlayerId = new Map<string, PlayerTerritoryRuleStats>();

  for (const territory of territories) {
    if (!territory.owner_campaign_player_id) continue;

    const existing = statsByPlayerId.get(territory.owner_campaign_player_id) ?? {
      controlledCount: 0,
      villageCount: 0,
      mineCount: 0,
    };

    existing.controlledCount += 1;

    if (territory.type === "village") {
      existing.villageCount += 1;
    }

    if (territory.type === "mine") {
      existing.mineCount += 1;
    }

    statsByPlayerId.set(territory.owner_campaign_player_id, existing);
  }

  return statsByPlayerId;
}

export function getTerritoryTypeEffectLabel(type: string) {
  if (type === "capital") {
    return "Capitale : +5 Gloire à l'attaquant qui la capture.";
  }

  if (type === "village") {
    return "Village : +100 points d'armée, jusqu'à +200 maximum.";
  }

  if (type === "mine") {
    return "Gisement : +1 Gloire à chaque fin de tour.";
  }

  if (type === "fort") {
    return "Forteresse : défense automatique, +200 points au défenseur.";
  }

  if (type === "magic_tower") {
    return "Tour magique : magicien niveau 1 pour le défenseur (santé 8, sauvegarde 4+).";
  }

  if (type === "ruins") {
    return "Ruines : +1 Gloire supplémentaire à la première conquête.";
  }

  if (type === "dragon") {
    return "Dragon : conquête neutre sur 4+ avec 1 soutien, +3 Gloire si conquise.";
  }

  if (type === "giant") {
    return "Géant : conquête neutre sur 4+ avec 1 soutien, +3 Gloire si conquise.";
  }

  return "Sauvage : aucun bonus particulier.";
}
