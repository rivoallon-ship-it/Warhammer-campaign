"use client";

import { useMemo, useState } from "react";
import { submitOrderAction } from "@/app/campaigns/[campaignId]/orders/actions";
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
  currentPlayerId: string | null;
  canSubmitOrders: boolean;
  unavailableMessage: string | null;
  existingOrder: ExistingOrder | null;
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
      target?.code ?? "un territoire"
    }`;
  }

  return `${getOrderActionLabel(existingOrder.actionType)} depuis ${
    source?.code ?? "?"
  } vers ${target?.code ?? "?"}`;
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
  const [commandMode, setCommandMode] = useState<"inspect" | "conquer">(
    existingOrder?.actionType === "conquer" ? "conquer" : "inspect",
  );
  const [conquestSourceId, setConquestSourceId] = useState(
    existingOrder?.actionType === "conquer"
      ? (existingOrder.sourceTerritoryId ?? "")
      : "",
  );
  const [conquestTargetId, setConquestTargetId] = useState(
    existingOrder?.actionType === "conquer"
      ? (existingOrder.targetTerritoryId ?? "")
      : "",
  );

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const territoryById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory])),
    [territories],
  );
  const territoryByCode = useMemo(
    () => new Map(territories.map((territory) => [territory.code, territory])),
    [territories],
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
  const conquestSource = conquestSourceId
    ? (territoryById.get(conquestSourceId) ?? null)
    : null;
  const conquestTarget = conquestTargetId
    ? (territoryById.get(conquestTargetId) ?? null)
    : null;
  const selectedOwner = selectedTerritory?.ownerCampaignPlayerId
    ? playersById.get(selectedTerritory.ownerCampaignPlayerId)
    : null;
  const selectedAdjacentCodes = selectedTerritory
    ? (adjacentCodesByCode.get(selectedTerritory.code) ?? new Set<string>())
    : new Set<string>();
  const selectedAdjacentTerritories = [...selectedAdjacentCodes]
    .map((code) => territoryByCode.get(code))
    .filter((territory): territory is CommandTerritory => Boolean(territory))
    .sort((left, right) => left.code.localeCompare(right.code, "fr"));
  const conquestSourceAdjacentCodes = conquestSource
    ? (adjacentCodesByCode.get(conquestSource.code) ?? new Set<string>())
    : new Set<string>();
  const validConquestTargets = conquestSource
    ? territories.filter(
        (territory) =>
          conquestSourceAdjacentCodes.has(territory.code) &&
          territory.ownerCampaignPlayerId !== currentPlayerId,
      )
    : [];
  const validConquestTargetIds = new Set(
    validConquestTargets.map((territory) => territory.id),
  );
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
  const canStartConquest =
    canSubmitOrders && isSelectedControlled && selectedValidConquestTargets.length > 0;

  function selectTerritory(territory: CommandTerritory) {
    setSelectedTerritoryId(territory.id);

    if (!canSubmitOrders || !currentPlayerId || commandMode !== "conquer") {
      return;
    }

    if (territory.ownerCampaignPlayerId === currentPlayerId) {
      setConquestSourceId(territory.id);
      setConquestTargetId("");
      return;
    }

    if (validConquestTargetIds.has(territory.id)) {
      setConquestTargetId(territory.id);
    }
  }

  function startConquestFromSelected() {
    if (!selectedTerritory || !canStartConquest) return;

    setCommandMode("conquer");
    setConquestSourceId(selectedTerritory.id);
    setConquestTargetId("");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Carte de campagne</CardTitle>
              <CardDescription>
                Clique sur tes territoires pour donner un ordre, puis sur une cible
                adjacente pour conquérir.
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="warning">Source</Badge>
                <Badge variant="success">Cible valide</Badge>
                <Badge variant="info">Adjacent</Badge>
                <Badge variant="neutral">Neutre</Badge>
              </div>
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
                const isSource = territory.id === conquestSource?.id;
                const isTarget = territory.id === conquestTarget?.id;
                const isAdjacentToSelected = selectedAdjacentCodes.has(territory.code);
                const isValidConquestTarget =
                  commandMode === "conquer" && validConquestTargetIds.has(territory.id);
                const borderColor = owner?.color ?? "#c8bca7";
                const backgroundColor = owner?.color ? `${owner.color}20` : "#f2eee5";

                return (
                  <button
                    key={territory.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => selectTerritory(territory)}
                    className={cn(
                      "min-h-28 rounded-md border-2 p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b84b35]",
                      isValidConquestTarget && "ring-2 ring-[#348a67] ring-offset-2",
                    )}
                    style={{
                      borderColor: isTarget
                        ? "#348a67"
                        : isSource
                          ? "#b84b35"
                          : isSelected
                            ? "#b84b35"
                            : isValidConquestTarget
                              ? "#348a67"
                              : isAdjacentToSelected
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
                      {isSource ? (
                        <span className="rounded-md border border-[#b84b35] bg-[#f7ded9] px-2 py-1 text-[11px] font-semibold text-[#7b2922]">
                          Source
                        </span>
                      ) : null}
                      {isValidConquestTarget ? (
                        <span className="rounded-md border border-[#348a67] bg-[#d7eadf] px-2 py-1 text-[11px] font-semibold text-[#1e5942]">
                          Cible
                        </span>
                      ) : null}
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
                ? `${selectedTerritory.code} - ${selectedTerritory.name}`
                : "Commandement"}
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
              </div>
            ) : null}

            {selectedTerritory ? (
              <dl className="grid gap-3 text-sm">
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
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
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                  <dt className="font-semibold text-[#302720]">Type</dt>
                  <dd className="mt-1 text-[#5d5148]">
                    {getTerritoryTypeLabel(selectedTerritory.type)}
                  </dd>
                </div>
                <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3">
                  <dt className="font-semibold text-[#302720]">Adjacents</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {selectedAdjacentTerritories.map((territory) => (
                      <button
                        key={territory.id}
                        type="button"
                        className="rounded-md border border-[#d8cbb7] bg-[#fffdf8] px-2 py-1 text-xs font-semibold text-[#5d5148] transition hover:bg-[#efe4d1]"
                        onClick={() => selectTerritory(territory)}
                      >
                        {territory.code}
                      </button>
                    ))}
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
                    <Button
                      type="button"
                      className="w-full"
                      disabled={!canStartConquest}
                      onClick={startConquestFromSelected}
                    >
                      Conquérir depuis {selectedTerritory.code}
                    </Button>

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
                        Fortifier {selectedTerritory.code}
                      </Button>
                    </form>
                  </>
                ) : commandMode === "conquer" && conquestSource ? null : (
                  <p className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-3 text-sm text-[#6a5e54]">
                    Sélectionne un territoire que tu contrôles pour donner un ordre.
                  </p>
                )}

                {commandMode === "conquer" && conquestSource ? (
                  <div className="rounded-md border border-[#7395bd] bg-[#ddeafa] p-3 text-sm text-[#284d77]">
                    <p className="font-semibold">
                      Source : {conquestSource.code} - {conquestSource.name}
                    </p>
                    {conquestTarget ? (
                      <p className="mt-2">
                        Cible : {conquestTarget.code} - {conquestTarget.name}
                      </p>
                    ) : (
                      <p className="mt-2">
                        Clique sur une cible verte adjacente pour préparer la
                        conquête.
                      </p>
                    )}
                    {validConquestTargets.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {validConquestTargets.map((territory) => (
                          <button
                            key={territory.id}
                            type="button"
                            className="rounded-md border border-[#348a67] bg-[#d7eadf] px-2 py-1 text-xs font-semibold text-[#1e5942] transition hover:bg-[#c4dfcf]"
                            onClick={() => {
                              setSelectedTerritoryId(territory.id);
                              setConquestTargetId(territory.id);
                            }}
                          >
                            {territory.code}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {commandMode === "conquer" && conquestSource && conquestTarget ? (
                  <form action={submitOrderAction}>
                    <input type="hidden" name="returnTo" value="campaign" />
                    <input type="hidden" name="campaignId" value={campaignId} />
                    <input type="hidden" name="actionType" value="conquer" />
                    <input
                      type="hidden"
                      name="sourceTerritoryId"
                      value={conquestSource.id}
                    />
                    <input
                      type="hidden"
                      name="targetTerritoryId"
                      value={conquestTarget.id}
                    />
                    <Button type="submit" className="w-full">
                      Valider la conquête
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
