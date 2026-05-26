"use client";

import { useMemo, useState } from "react";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { getColorLabel } from "@/lib/campaigns/join-campaign";

type CampaignMapPlayer = {
  id: string;
  displayName: string;
  faction: string | null;
  color: string | null;
};

type CampaignMapTerritory = {
  id: string;
  code: string;
  name: string;
  type: string;
  positionX: number;
  positionY: number;
  ownerCampaignPlayerId: string | null;
  isFortified: boolean;
  localFaction: string | null;
};

type CampaignMapAdjacency = {
  territoryCode: string;
  adjacentTerritoryCode: string;
};

type CampaignMapViewProps = {
  mapWidth: number;
  mapHeight: number;
  players: CampaignMapPlayer[];
  territories: CampaignMapTerritory[];
  adjacencies: CampaignMapAdjacency[];
};

const territoryTypeLabels: Record<string, string> = {
  capital: "Capitale",
  village: "Village",
  ruins: "Ruines",
  fort: "Fort",
  magic_tower: "Tour",
  dragon: "Dragon",
  giant: "Géant",
  wild: "Sauvage",
};

const territoryTypeMarks: Record<string, string> = {
  capital: "CA",
  village: "VI",
  ruins: "RU",
  fort: "FO",
  magic_tower: "TO",
  dragon: "DR",
  giant: "GE",
  wild: "SA",
};

function getTerritoryTypeLabel(type: string) {
  return territoryTypeLabels[type] ?? type;
}

function getTerritoryTypeMark(type: string) {
  return territoryTypeMarks[type] ?? type.slice(0, 2).toUpperCase();
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-3 rounded-sm border border-[#c8bca7]"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function getNarrativeBonus(territory: CampaignMapTerritory) {
  if (territory.type === "dragon") return "Territoire narratif Dragon.";
  if (territory.type === "giant") return "Territoire narratif Géant.";
  if (territory.type === "fort") return "Position défensive importante.";
  if (territory.type === "magic_tower") return "Lieu arcanique stratégique.";
  if (territory.type === "capital") return "Capitale de départ.";

  return "Territoire de campagne standard.";
}

export function CampaignMapView({
  mapWidth,
  mapHeight,
  players,
  territories,
  adjacencies,
}: CampaignMapViewProps) {
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(
    territories[0]?.id ?? null,
  );
  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const territoriesByCode = useMemo(
    () => new Map(territories.map((territory) => [territory.code, territory])),
    [territories],
  );
  const selectedTerritory =
    territories.find((territory) => territory.id === selectedTerritoryId) ??
    territories[0] ??
    null;
  const adjacentCodes = useMemo(() => {
    if (!selectedTerritory) return new Set<string>();

    return new Set(
      adjacencies
        .filter((adjacency) => adjacency.territoryCode === selectedTerritory.code)
        .map((adjacency) => adjacency.adjacentTerritoryCode),
    );
  }, [adjacencies, selectedTerritory]);
  const selectedOwner = selectedTerritory?.ownerCampaignPlayerId
    ? playersById.get(selectedTerritory.ownerCampaignPlayerId)
    : null;
  const adjacentTerritories = [...adjacentCodes]
    .map((code) => territoriesByCode.get(code))
    .filter((territory): territory is CampaignMapTerritory => Boolean(territory))
    .sort((left, right) => left.code.localeCompare(right.code, "fr"));

  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
      <Card>
        <CardHeader>
          <CardTitle>Carte</CardTitle>
          <CardDescription>
            {mapWidth} x {mapHeight} — {territories.length} territoires
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2">
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${mapWidth}, minmax(112px, 1fr))`,
                minWidth: `${mapWidth * 118}px`,
              }}
            >
              {territories.map((territory) => {
                const owner = territory.ownerCampaignPlayerId
                  ? playersById.get(territory.ownerCampaignPlayerId)
                  : null;
                const isSelected = territory.id === selectedTerritory?.id;
                const isAdjacent = adjacentCodes.has(territory.code);
                const borderColor = owner?.color ?? "#c8bca7";
                const backgroundColor = owner?.color ? `${owner.color}20` : "#f2eee5";

                return (
                  <button
                    key={territory.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTerritoryId(territory.id)}
                    className="min-h-28 rounded-md border-2 p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b35]"
                    style={{
                      borderColor: isSelected
                        ? "#b84b35"
                        : isAdjacent
                          ? "#7395bd"
                          : borderColor,
                      backgroundColor,
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#302720]">
                        {territory.code}
                      </span>
                      <span className="rounded-md border border-[#d8cbb7] bg-[#fffaf0] px-1.5 py-0.5 text-[10px] font-bold text-[#5d5148]">
                        {getTerritoryTypeMark(territory.type)}
                      </span>
                    </span>
                    <span className="mt-3 block line-clamp-2 min-h-10 font-semibold leading-5 text-[#302720]">
                      {territory.name}
                    </span>
                    <span className="mt-2 block truncate text-xs text-[#5d5148]">
                      {owner?.displayName ?? "Neutre"}
                    </span>
                    <span className="mt-3 flex flex-wrap gap-1">
                      <span className="rounded-md border border-[#d8cbb7] bg-[#fffaf0] px-2 py-1 text-[11px] font-semibold text-[#5d5148]">
                        {getTerritoryTypeLabel(territory.type)}
                      </span>
                      {territory.isFortified ? (
                        <span className="rounded-md border border-[#c99a3d] bg-[#f7e7bf] px-2 py-1 text-[11px] font-semibold text-[#644512]">
                          Fortifié
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTerritory
                ? `${selectedTerritory.code} — ${selectedTerritory.name}`
                : "Territoire"}
            </CardTitle>
            <CardDescription>
              Fiche du territoire sélectionné et adjacences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTerritory ? (
              <>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="font-semibold text-[#302720]">Type</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {getTerritoryTypeLabel(selectedTerritory.type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#302720]">Propriétaire</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {selectedOwner ? (
                        <span className="inline-flex items-center gap-2">
                          {selectedOwner.color ? (
                            <ColorSwatch color={selectedOwner.color} />
                          ) : null}
                          {selectedOwner.displayName}
                        </span>
                      ) : (
                        "Neutre"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#302720]">Statut</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {selectedTerritory.isFortified ? "Fortifié" : "Non fortifié"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#302720]">Faction locale</dt>
                    <dd className="mt-1 text-[#5d5148]">
                      {selectedTerritory.localFaction ?? "Aucune"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#302720]">Adjacent à</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {adjacentTerritories.map((territory) => (
                        <button
                          key={territory.id}
                          type="button"
                          className="rounded-md border border-[#d8cbb7] bg-[#fffdf8] px-2 py-1 text-xs font-semibold text-[#5d5148] transition hover:bg-[#efe4d1]"
                          onClick={() => setSelectedTerritoryId(territory.id)}
                        >
                          {territory.code}
                        </button>
                      ))}
                    </dd>
                  </div>
                </dl>
                <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#5d5148]">
                  {getNarrativeBonus(selectedTerritory)}
                </p>
              </>
            ) : (
              <p className="text-sm text-[#5d5148]">
                Aucun territoire sélectionné.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Légende</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(territoryTypeLabels).map(([type, label]) => (
              <Badge key={type} variant="neutral">
                {getTerritoryTypeMark(type)} {label}
              </Badge>
            ))}
            <Badge variant="warning">Fortifié</Badge>
            <Badge variant="info">Adjacent</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Joueurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm"
              >
                <span>
                  <span className="font-semibold text-[#302720]">
                    {player.displayName}
                  </span>
                  <span className="mt-1 block text-[#6a5e54]">
                    {player.faction ?? "Faction non renseignée"}
                  </span>
                </span>
                {player.color ? (
                  <Badge variant="neutral" className="gap-2">
                    <ColorSwatch color={player.color} />
                    {getColorLabel(player.color)}
                  </Badge>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
