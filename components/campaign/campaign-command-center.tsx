"use client";

import { useMemo, useState } from "react";
import {
  cancelOrderAction,
  submitOrderAction,
} from "@/app/campaigns/[campaignId]/orders/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type CommandPlayer = {
  id: string;
  displayName: string;
  faction: string | null;
  color: string | null;
};

type CommandTerritory = {
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

type CommandAdjacency = {
  territoryCode: string;
  adjacentTerritoryCode: string;
};

type ExistingOrder = {
  actionType: string;
  sourceTerritoryId: string | null;
  targetTerritoryId: string | null;
  status: string;
};

type CampaignCommandCenterProps = {
  campaignId: string;
  mapWidth: number;
  mapHeight: number;
  players: CommandPlayer[];
  territories: CommandTerritory[];
  adjacencies: CommandAdjacency[];
  contestedTerritoryIds: string[];
  currentPlayerId: string | null;
  canSubmitOrders: boolean;
  unavailableMessage: string | null;
  existingOrder: ExistingOrder | null;
};

const neutralTerritoryColor = "#c8bca7";
const neutralTerritoryFill = "#f2eee5";
const contestedTerritoryColor = "#9f2f45";
const contestedTerritoryFill = "#f7d7df";

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

function getTerritoryTypeMark(type: string) {
  return territoryTypeMarks[type] ?? type.slice(0, 2).toUpperCase();
}

function getOrderStatusLabel(status: string) {
  if (status === "draft") return "Brouillon";
  if (status === "submitted") return "Validé";
  if (status === "revealed") return "Révélé";
  if (status === "resolved") return "Résolu";

  return status;
}

function getOrderStatusVariant(status: string) {
  if (status === "submitted" || status === "revealed" || status === "resolved") {
    return "success" as const;
  }

  if (status === "draft") return "warning" as const;

  return "neutral" as const;
}

function getOrderActionLabel(actionType: string) {
  if (actionType === "attack" || actionType === "explore" || actionType === "conquer") {
    return "Conquérir";
  }

  if (actionType === "fortify") return "Fortifier";

  return actionType;
}

function getOrderSummary(
  existingOrder: ExistingOrder,
  territoryById: Map<string, CommandTerritory>,
) {
  const source = existingOrder.sourceTerritoryId
    ? territoryById.get(existingOrder.sourceTerritoryId)
    : null;
  const target = existingOrder.targetTerritoryId
    ? territoryById.get(existingOrder.targetTerritoryId)
    : null;

  if (existingOrder.actionType === "fortify") {
    return `${getOrderActionLabel(existingOrder.actionType)} ${
      target?.name ?? "un territoire"
    }`;
  }

  return `${getOrderActionLabel(existingOrder.actionType)} ${
    target?.name ?? source?.name ?? "un territoire"
  }`;
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

export function CampaignCommandCenter({
  campaignId,
  mapWidth,
  mapHeight,
  players,
  territories,
  adjacencies,
  contestedTerritoryIds,
  currentPlayerId,
  canSubmitOrders,
  unavailableMessage,
  existingOrder,
}: CampaignCommandCenterProps) {
  const initialControlledTerritoryId =
    (currentPlayerId
      ? territories.find(
          (territory) => territory.ownerCampaignPlayerId === currentPlayerId,
        )?.id
      : null) ??
    existingOrder?.targetTerritoryId ??
    territories[0]?.id ??
    null;
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(
    initialControlledTerritoryId,
  );

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const territoryById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory])),
    [territories],
  );
  const contestedTerritoryIdSet = useMemo(
    () => new Set(contestedTerritoryIds),
    [contestedTerritoryIds],
  );
  const adjacentCodesByCode = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const adjacency of adjacencies) {
      const existing = map.get(adjacency.territoryCode) ?? new Set<string>();
      existing.add(adjacency.adjacentTerritoryCode);
      map.set(adjacency.territoryCode, existing);
    }

    return map;
  }, [adjacencies]);

  const selectedTerritory = selectedTerritoryId
    ? (territoryById.get(selectedTerritoryId) ?? territories[0] ?? null)
    : (territories[0] ?? null);
  const selectedOwner = selectedTerritory?.ownerCampaignPlayerId
    ? playersById.get(selectedTerritory.ownerCampaignPlayerId)
    : null;
  const isSelectedContested = selectedTerritory
    ? contestedTerritoryIdSet.has(selectedTerritory.id)
    : false;
  const selectedAdjacentCodes = selectedTerritory
    ? (adjacentCodesByCode.get(selectedTerritory.code) ?? new Set<string>())
    : new Set<string>();
  const controlledTerritories = currentPlayerId
    ? territories.filter(
        (territory) => territory.ownerCampaignPlayerId === currentPlayerId,
      )
    : [];
  const selectedValidConquestTargets =
    selectedTerritory?.ownerCampaignPlayerId === currentPlayerId
      ? territories.filter(
          (territory) =>
            selectedAdjacentCodes.has(territory.code) &&
            territory.ownerCampaignPlayerId !== currentPlayerId,
        )
      : [];
  const isSelectedControlled =
    Boolean(selectedTerritory) &&
    selectedTerritory?.ownerCampaignPlayerId === currentPlayerId;
  const conquestSourcesForSelectedTarget =
    selectedTerritory && !isSelectedControlled
      ? controlledTerritories.filter((territory) =>
          adjacentCodesByCode
            .get(territory.code)
            ?.has(selectedTerritory.code),
        )
      : [];
  const conquestSourceForSelectedTarget =
    conquestSourcesForSelectedTarget[0] ?? null;
  const canConquerSelectedTerritory =
    canSubmitOrders && Boolean(conquestSourceForSelectedTarget);
  const canCancelExistingOrder =
    canSubmitOrders &&
    Boolean(existingOrder && ["draft", "submitted"].includes(existingOrder.status));

  function selectTerritory(territory: CommandTerritory) {
    setSelectedTerritoryId(territory.id);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Carte de campagne</CardTitle>
              <CardDescription>
                Clique sur une case : les ordres disponibles apparaissent à droite.
              </CardDescription>
            </div>
            <Badge variant="neutral">
              {mapWidth} x {mapHeight} - {territories.length} territoires
            </Badge>
          </div>
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
                const isContested = contestedTerritoryIdSet.has(territory.id);
                const territoryColor = isContested
                  ? contestedTerritoryColor
                  : (owner?.color ?? neutralTerritoryColor);
                const backgroundColor = isContested
                  ? contestedTerritoryFill
                  : owner?.color
                    ? `${owner.color}2b`
                    : neutralTerritoryFill;
                const ownerLabel = isContested
                  ? "Bataille en cours"
                  : (owner?.displayName ?? "Neutre");

                return (
                  <button
                    key={territory.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectTerritory(territory)}
                    className={cn(
                      "min-h-28 rounded-md border-2 p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#302720]",
                      isSelected && "shadow-sm",
                    )}
                    style={{
                      borderColor: territoryColor,
                      backgroundColor,
                      boxShadow: isSelected ? "0 0 0 2px #302720" : undefined,
                    }}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 min-h-10 font-semibold leading-5 text-[#302720]">
                        {territory.name}
                      </span>
                      <span className="rounded-md border border-[#d8cbb7] bg-[#fffaf0] px-1.5 py-0.5 text-[10px] font-bold text-[#5d5148]">
                        {getTerritoryTypeMark(territory.type)}
                      </span>
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs font-medium text-[#5d5148]">
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-sm border border-[#fffdf8]"
                        style={{ backgroundColor: territoryColor }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{ownerLabel}</span>
                    </span>
                    {isContested || territory.isFortified ? (
                      <span className="mt-3 flex flex-wrap gap-1">
                        {isContested ? (
                          <span className="rounded-md border border-[#9f2f45] bg-[#f7d7df] px-2 py-1 text-[11px] font-semibold text-[#64172a]">
                            Bataille
                          </span>
                        ) : null}
                        {territory.isFortified ? (
                          <span className="rounded-md border border-[#c99a3d] bg-[#f7e7bf] px-2 py-1 text-[11px] font-semibold text-[#644512]">
                            Fortifié
                          </span>
                        ) : null}
                      </span>
                    ) : null}
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
              {selectedTerritory ? selectedTerritory.name : "Commandement"}
            </CardTitle>
            <CardDescription>
              Territoire sélectionné et actions possibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingOrder ? (
              <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#302720]">
                      Ordre actuel
                    </p>
                    <p className="mt-1 text-sm text-[#6a5e54]">
                      {getOrderSummary(existingOrder, territoryById)}
                    </p>
                  </div>
                  <Badge variant={getOrderStatusVariant(existingOrder.status)}>
                    {getOrderStatusLabel(existingOrder.status)}
                  </Badge>
                </div>
                {canCancelExistingOrder ? (
                  <form action={cancelOrderAction} className="mt-3">
                    <input type="hidden" name="returnTo" value="campaign" />
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <Button type="submit" variant="outline" size="sm">
                      Annuler l&apos;ordre
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}

            {selectedTerritory ? (
              <dl className="grid gap-3 text-sm">
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                  <dt className="font-semibold text-[#302720]">Propriétaire</dt>
                  <dd className="mt-1 space-y-2 text-[#5d5148]">
                    {selectedOwner ? (
                      <div className="inline-flex items-center gap-2">
                        {selectedOwner.color ? (
                          <ColorSwatch color={selectedOwner.color} />
                        ) : null}
                        {selectedOwner.displayName}
                      </div>
                    ) : (
                      <div>Neutre</div>
                    )}
                    {isSelectedContested ? (
                      <div className="inline-flex rounded-md border border-[#9f2f45] bg-[#f7d7df] px-2 py-1 text-xs font-semibold text-[#64172a]">
                        Bataille en cours
                      </div>
                    ) : null}
                  </dd>
                </div>
              </dl>
            ) : null}

            {unavailableMessage ? (
              <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#6a5e54]">
                {unavailableMessage}
              </p>
            ) : null}

            {canSubmitOrders && selectedTerritory ? (
              <div className="space-y-3">
                {isSelectedControlled ? (
                  <>
                    <form action={submitOrderAction}>
                      <input type="hidden" name="returnTo" value="campaign" />
                      <input type="hidden" name="campaignId" value={campaignId} />
                      <input type="hidden" name="actionType" value="fortify" />
                      <input type="hidden" name="sourceTerritoryId" value="" />
                      <input
                        type="hidden"
                        name="targetTerritoryId"
                        value={selectedTerritory.id}
                      />
                      <Button type="submit" variant="secondary" className="w-full">
                        Fortifier
                      </Button>
                    </form>

                    {selectedValidConquestTargets.length ? (
                      <div className="rounded-md border border-[#7395bd] bg-[#ddeafa] p-3 text-sm text-[#284d77]">
                        <p className="font-semibold">Cibles à portée</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedValidConquestTargets.map((territory) => (
                            <button
                              key={territory.id}
                              type="button"
                              className="rounded-md border border-[#348a67] bg-[#d7eadf] px-2 py-1 text-left text-xs font-semibold text-[#1e5942] transition hover:bg-[#c4dfcf]"
                              onClick={() => selectTerritory(territory)}
                            >
                              {territory.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#6a5e54]">
                        Aucune cible adjacente disponible depuis ce territoire.
                      </p>
                    )}
                  </>
                ) : canConquerSelectedTerritory && conquestSourceForSelectedTarget ? (
                  <form action={submitOrderAction}>
                    <input type="hidden" name="returnTo" value="campaign" />
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="actionType" value="conquer" />
                    <input
                      type="hidden"
                      name="sourceTerritoryId"
                      value={conquestSourceForSelectedTarget.id}
                    />
                    <input
                      type="hidden"
                      name="targetTerritoryId"
                      value={selectedTerritory.id}
                    />
                    <Button type="submit" className="w-full">
                      Conquérir
                    </Button>
                  </form>
                ) : (
                  <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#6a5e54]">
                    Cette zone ne peut pas être conquise depuis tes territoires
                    actuels.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
