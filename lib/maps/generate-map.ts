import type { SupabaseClient } from "@supabase/supabase-js";
import { getMapConfig, isSupportedPlayerCount } from "@/lib/maps/map-configs";
import {
  generateHexAdjacencies,
  generateOrthogonalAdjacencies,
  generateTerritoryCoordinates,
  stableHash,
  sortByStableSeed,
  type TerritoryAdjacency,
  type TerritoryCoordinate,
} from "@/lib/maps/map-utils";
import {
  expandNonCapitalDistribution,
  getTerritoryDistribution,
  getTerritoryDistributionTotal,
  TERRITORY_TYPE_ORDER,
} from "@/lib/maps/territory-distribution";
import { getTerritoryName } from "@/lib/maps/territory-names";
import type { TerritoryType } from "@/types/campaign";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];
type TerritoryInsert = Database["public"]["Tables"]["territories"]["Insert"];
type AdjacencyInsert =
  Database["public"]["Tables"]["territory_adjacencies"]["Insert"];

type MapGenerationData = {
  campaign: CampaignRow;
  activePlayers: CampaignPlayerRow[];
};

type GeneratedMapRows = {
  territories: TerritoryInsert[];
  adjacencies: AdjacencyInsert[];
};

const BALANCED_ACCESS_TYPES: TerritoryType[] = [
  "village",
  "mine",
  "dragon",
  "giant",
];

export type GenerateMapResult = {
  territoryCount: number;
  adjacencyCount: number;
  error: string | null;
};

function normalizeCapital(value: string | null) {
  return value?.trim().toUpperCase() ?? "";
}

function getFortifiedCapitalSlots(campaign: CampaignRow) {
  if (!isSupportedPlayerCount(campaign.player_count)) return [];

  const config = getMapConfig(campaign.player_count);

  return "fortifiedCapitalSlots" in config
    ? ([...config.fortifiedCapitalSlots] as string[])
    : [];
}

function getCapitalSlots(campaign: CampaignRow) {
  if (!isSupportedPlayerCount(campaign.player_count)) return [];

  return [...getMapConfig(campaign.player_count).capitalSlots] as string[];
}

function getLocalFaction(type: TerritoryType) {
  if (type === "dragon" || type === "giant") return type;

  return null;
}

function isHexTemplate(template: string) {
  return template.startsWith("hex_");
}

function getMapAdjacencies(campaign: CampaignRow) {
  return isHexTemplate(campaign.map_template)
    ? generateHexAdjacencies(campaign.map_width, campaign.map_height)
    : generateOrthogonalAdjacencies(campaign.map_width, campaign.map_height);
}

function buildAdjacencyMap(adjacencies: TerritoryAdjacency[]) {
  const adjacencyMap = new Map<string, string[]>();

  for (const adjacency of adjacencies) {
    const neighbors = adjacencyMap.get(adjacency.territoryCode) ?? [];

    neighbors.push(adjacency.adjacentTerritoryCode);
    adjacencyMap.set(adjacency.territoryCode, neighbors);
  }

  return adjacencyMap;
}

function getDistancesFrom(
  startCode: string,
  adjacencyMap: Map<string, string[]>,
) {
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

function getCapitalDistances(
  capitalSlots: string[],
  adjacencies: TerritoryAdjacency[],
) {
  const adjacencyMap = buildAdjacencyMap(adjacencies);

  return new Map(
    capitalSlots.map((capitalCode) => [
      capitalCode,
      getDistancesFrom(capitalCode, adjacencyMap),
    ]),
  );
}

function getDistanceToCapital(
  coordinate: TerritoryCoordinate,
  capitalCode: string,
  capitalDistances: Map<string, Map<string, number>>,
) {
  return capitalDistances.get(capitalCode)?.get(coordinate.code) ?? Infinity;
}

function getDistancesToCapitals(
  coordinate: TerritoryCoordinate,
  capitalSlots: string[],
  capitalDistances: Map<string, Map<string, number>>,
) {
  return capitalSlots
    .map((capitalCode) =>
      getDistanceToCapital(coordinate, capitalCode, capitalDistances),
    )
    .filter(Number.isFinite);
}

function getBestCoordinateForCapital(
  availableCoordinates: TerritoryCoordinate[],
  capitalCode: string,
  capitalSlots: string[],
  capitalDistances: Map<string, Map<string, number>>,
  seed: string,
) {
  return [...availableCoordinates]
    .filter((coordinate) =>
      Number.isFinite(getDistanceToCapital(coordinate, capitalCode, capitalDistances)),
    )
    .sort((left, right) => {
      const leftDistance = getDistanceToCapital(
        left,
        capitalCode,
        capitalDistances,
      );
      const rightDistance = getDistanceToCapital(
        right,
        capitalCode,
        capitalDistances,
      );

      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      const leftNearestOtherDistance = Math.min(
        ...capitalSlots
          .filter((code) => code !== capitalCode)
          .map((code) => getDistanceToCapital(left, code, capitalDistances)),
      );
      const rightNearestOtherDistance = Math.min(
        ...capitalSlots
          .filter((code) => code !== capitalCode)
          .map((code) => getDistanceToCapital(right, code, capitalDistances)),
      );

      if (leftNearestOtherDistance !== rightNearestOtherDistance) {
        return rightNearestOtherDistance - leftNearestOtherDistance;
      }

      return (
        stableHash(`${seed}:${capitalCode}:${left.code}`) -
        stableHash(`${seed}:${capitalCode}:${right.code}`)
      );
    })[0];
}

function getSharedBalancedCoordinates(
  availableCoordinates: TerritoryCoordinate[],
  count: number,
  capitalSlots: string[],
  capitalDistances: Map<string, Map<string, number>>,
  seed: string,
) {
  return [...availableCoordinates]
    .filter((coordinate) =>
      getDistancesToCapitals(coordinate, capitalSlots, capitalDistances).length,
    )
    .sort((left, right) => {
      const leftDistances = getDistancesToCapitals(
        left,
        capitalSlots,
        capitalDistances,
      );
      const rightDistances = getDistancesToCapitals(
        right,
        capitalSlots,
        capitalDistances,
      );
      const leftSpread = Math.max(...leftDistances) - Math.min(...leftDistances);
      const rightSpread = Math.max(...rightDistances) - Math.min(...rightDistances);

      if (leftSpread !== rightSpread) return leftSpread - rightSpread;

      const leftAverage =
        leftDistances.reduce((sum, distance) => sum + distance, 0) /
        leftDistances.length;
      const rightAverage =
        rightDistances.reduce((sum, distance) => sum + distance, 0) /
        rightDistances.length;

      if (leftAverage !== rightAverage) return leftAverage - rightAverage;

      return stableHash(`${seed}:shared:${left.code}`) - stableHash(`${seed}:shared:${right.code}`);
    })
    .slice(0, count);
}

function getTypeByCode(
  campaign: CampaignRow,
  coordinates: TerritoryCoordinate[],
) {
  if (!isSupportedPlayerCount(campaign.player_count)) {
    return { typeByCode: null, error: "Nombre de joueurs non supporte." };
  }

  const distribution = getTerritoryDistribution(campaign.player_count);
  const expectedTotal = getTerritoryDistributionTotal(distribution);
  const actualTotal = campaign.map_width * campaign.map_height;

  if (expectedTotal !== actualTotal) {
    return {
      typeByCode: null,
      error: "La repartition des territoires ne correspond pas a la carte.",
    };
  }

  const capitalSlots = new Set(getCapitalSlots(campaign));
  const capitalSlotCodes = getCapitalSlots(campaign);
  const nonCapitalCoordinates = coordinates.filter(
    (coordinate) => !capitalSlots.has(coordinate.code),
  );
  const nonCapitalTypes = expandNonCapitalDistribution(distribution);

  if (nonCapitalTypes.length !== nonCapitalCoordinates.length) {
    return {
      typeByCode: null,
      error: "Le nombre de territoires non-capitales est invalide.",
    };
  }

  const typeByCode = new Map<string, TerritoryType>();

  getCapitalSlots(campaign).forEach((code) => {
    typeByCode.set(code, "capital");
  });

  const remainingCoordinates = new Map(
    nonCapitalCoordinates.map((coordinate) => [coordinate.code, coordinate]),
  );
  const remainingTypeCounts = new Map<TerritoryType, number>();
  const capitalDistances = getCapitalDistances(
    capitalSlotCodes,
    getMapAdjacencies(campaign),
  );

  nonCapitalTypes.forEach((type) => {
    remainingTypeCounts.set(type, (remainingTypeCounts.get(type) ?? 0) + 1);
  });

  function assignTypeToCoordinate(type: TerritoryType, coordinate: TerritoryCoordinate) {
    typeByCode.set(coordinate.code, type);
    remainingCoordinates.delete(coordinate.code);
    remainingTypeCounts.set(type, (remainingTypeCounts.get(type) ?? 0) - 1);
  }

  for (const type of BALANCED_ACCESS_TYPES) {
    const typeCount = remainingTypeCounts.get(type) ?? 0;

    if (typeCount <= 0) continue;

    const fullRounds = Math.floor(typeCount / capitalSlotCodes.length);
    const sharedCount = typeCount % capitalSlotCodes.length;

    for (let round = 0; round < fullRounds; round += 1) {
      for (const capitalCode of capitalSlotCodes) {
        const coordinate = getBestCoordinateForCapital(
          [...remainingCoordinates.values()],
          capitalCode,
          capitalSlotCodes,
          capitalDistances,
          `${campaign.id}:${type}:${round}`,
        );

        if (!coordinate) {
          return {
            typeByCode: null,
            error: "Impossible d'equilibrer les territoires strategiques.",
          };
        }

        assignTypeToCoordinate(type, coordinate);
      }
    }

    getSharedBalancedCoordinates(
      [...remainingCoordinates.values()],
      sharedCount,
      capitalSlotCodes,
      capitalDistances,
      `${campaign.id}:${type}:shared`,
    ).forEach((coordinate) => {
      assignTypeToCoordinate(type, coordinate);
    });
  }

  const remainingTypes = TERRITORY_TYPE_ORDER.flatMap((type) =>
    Array.from({ length: Math.max(remainingTypeCounts.get(type) ?? 0, 0) }, () => type),
  );

  sortByStableSeed(
    [...remainingCoordinates.values()],
    campaign.id,
    (coordinate) => coordinate.code,
  ).forEach((coordinate, index) => {
    typeByCode.set(coordinate.code, remainingTypes[index] ?? "wild");
  });

  return { typeByCode, error: null };
}

function validateMapGenerationData({ campaign, activePlayers }: MapGenerationData) {
  if (campaign.status !== "lobby") {
    return "La carte ne peut etre generee que depuis le lobby.";
  }

  if (!isSupportedPlayerCount(campaign.player_count)) {
    return "Une campagne doit avoir entre 2 et 6 joueurs.";
  }

  const config = getMapConfig(campaign.player_count);

  if (
    campaign.map_width !== config.width ||
    campaign.map_height !== config.height ||
    campaign.map_template !== config.template
  ) {
    return "La configuration de carte de cette campagne est incoherente.";
  }

  if (activePlayers.length !== campaign.player_count) {
    return "Le nombre de joueurs actifs ne correspond pas aux places prevues.";
  }

  const capitalSlots = new Set(getCapitalSlots(campaign));
  const playerCapitalCodes = activePlayers.map((player) =>
    normalizeCapital(player.starting_capital_code),
  );

  if (playerCapitalCodes.some((capitalCode) => !capitalCode)) {
    return "Chaque joueur actif doit avoir une capitale.";
  }

  if (new Set(playerCapitalCodes).size !== playerCapitalCodes.length) {
    return "Chaque joueur actif doit avoir une capitale unique.";
  }

  if (playerCapitalCodes.some((capitalCode) => !capitalSlots.has(capitalCode))) {
    return "Une capitale choisie n'est pas autorisee pour cette carte.";
  }

  return null;
}

function buildMapRows({ campaign, activePlayers }: MapGenerationData) {
  const coordinates = generateTerritoryCoordinates(
    campaign.map_width,
    campaign.map_height,
  );
  const { typeByCode, error } = getTypeByCode(campaign, coordinates);

  if (error || !typeByCode) {
    return { rows: null, error: error ?? "Carte invalide." };
  }

  const ownerByCapitalCode = new Map(
    activePlayers.map((player) => [
      normalizeCapital(player.starting_capital_code),
      player,
    ]),
  );
  const fortifiedCapitalSlots = new Set(getFortifiedCapitalSlots(campaign));
  const nameIndexByType = new Map<TerritoryType, number>();

  const territories: TerritoryInsert[] = coordinates.map((coordinate) => {
    const type = typeByCode.get(coordinate.code) ?? "wild";
    const nameIndex = nameIndexByType.get(type) ?? 0;
    const owner = ownerByCapitalCode.get(coordinate.code);

    nameIndexByType.set(type, nameIndex + 1);

    return {
      campaign_id: campaign.id,
      code: coordinate.code,
      name: getTerritoryName(type, nameIndex),
      type,
      position_x: coordinate.positionX,
      position_y: coordinate.positionY,
      owner_campaign_player_id: owner?.id ?? null,
      is_fortified: fortifiedCapitalSlots.has(coordinate.code),
      has_garrison: false,
      local_faction: getLocalFaction(type),
    };
  });

  const adjacencyRows = getMapAdjacencies(campaign);
  const adjacencies: AdjacencyInsert[] = adjacencyRows.map((adjacency) => ({
    campaign_id: campaign.id,
    territory_code: adjacency.territoryCode,
    adjacent_territory_code: adjacency.adjacentTerritoryCode,
  }));

  return {
    rows: { territories, adjacencies } satisfies GeneratedMapRows,
    error: null,
  };
}

async function getMapGenerationData(
  supabase: SupabaseClient<Database>,
  campaignId: string,
) {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { data: null, error: "Campagne introuvable." };
  }

  const { data: activePlayers, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (playersError) {
    return { data: null, error: "Impossible de charger les joueurs actifs." };
  }

  return {
    data: { campaign, activePlayers: activePlayers ?? [] },
    error: null,
  };
}

export function generateMapRows(data: MapGenerationData) {
  const validationError = validateMapGenerationData(data);

  if (validationError) {
    return { rows: null, error: validationError };
  }

  return buildMapRows(data);
}

async function getExistingMapResult(
  supabase: SupabaseClient<Database>,
  campaign: CampaignRow,
) {
  const { data: existingTerritories, error: territoriesError } = await supabase
    .from("territories")
    .select("id")
    .eq("campaign_id", campaign.id);

  if (territoriesError) {
    return {
      result: null,
      error: "Impossible de verifier la carte existante.",
    };
  }

  if (!existingTerritories.length) {
    return { result: null, error: null };
  }

  const expectedTerritoryCount = campaign.map_width * campaign.map_height;

  if (existingTerritories.length !== expectedTerritoryCount) {
    return {
      result: null,
      error: "La carte existante est incomplete.",
    };
  }

  const { data: existingAdjacencies, error: adjacenciesError } = await supabase
    .from("territory_adjacencies")
    .select("id")
    .eq("campaign_id", campaign.id);

  if (adjacenciesError) {
    return {
      result: null,
      error: "Impossible de verifier les adjacences existantes.",
    };
  }

  const expectedAdjacencyCount = (
    campaign.map_template.startsWith("hex_")
      ? generateHexAdjacencies
      : generateOrthogonalAdjacencies
  )(campaign.map_width, campaign.map_height).length;

  if (existingAdjacencies.length !== expectedAdjacencyCount) {
    return {
      result: null,
      error: "Les adjacences existantes sont incompletes.",
    };
  }

  return {
    result: {
      territoryCount: existingTerritories.length,
      adjacencyCount: existingAdjacencies.length,
      error: null,
    } satisfies GenerateMapResult,
    error: null,
  };
}

export async function generateMap(
  supabase: SupabaseClient<Database>,
  campaignId: string,
): Promise<GenerateMapResult> {
  const { data, error: dataError } = await getMapGenerationData(
    supabase,
    campaignId,
  );

  if (dataError || !data) {
    return { territoryCount: 0, adjacencyCount: 0, error: dataError };
  }

  const { result: existingMapResult, error: existingMapError } =
    await getExistingMapResult(supabase, data.campaign);

  if (existingMapError) {
    return {
      territoryCount: 0,
      adjacencyCount: 0,
      error: existingMapError,
    };
  }

  if (existingMapResult) {
    return existingMapResult;
  }

  const { rows, error: generationError } = generateMapRows(data);

  if (generationError || !rows) {
    return {
      territoryCount: 0,
      adjacencyCount: 0,
      error: generationError ?? "Impossible de generer la carte.",
    };
  }

  const { error: territoriesError } = await supabase
    .from("territories")
    .insert(rows.territories);

  if (territoriesError) {
    return {
      territoryCount: 0,
      adjacencyCount: 0,
      error: "Impossible d'enregistrer les territoires.",
    };
  }

  const { error: adjacenciesError } = await supabase
    .from("territory_adjacencies")
    .insert(rows.adjacencies);

  if (adjacenciesError) {
    await supabase.from("territories").delete().eq("campaign_id", data.campaign.id);

    return {
      territoryCount: 0,
      adjacencyCount: 0,
      error: "Impossible d'enregistrer les adjacences.",
    };
  }

  return {
    territoryCount: rows.territories.length,
    adjacencyCount: rows.adjacencies.length,
    error: null,
  };
}
