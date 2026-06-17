"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelOrderAction,
  submitOrderAction,
} from "@/app/campaigns/[campaignId]/orders/actions";
import { LegendaryRecruitmentCard } from "@/components/campaign/legendary-recruitment-card";
import {
  getNeutralConquestDifficultyLabel,
  getTerritoryTypeEffectLabel,
} from "@/lib/campaigns/territory-rules";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  blendHexColors,
  getReadableTextColor,
  getVisibleAccentColor,
} from "@/lib/colors";
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

type RecruitmentState = {
  glory: number;
  dragonTerritoryCount: number;
  giantTerritoryCount: number;
  dragonRecruits: number;
  giantRecruits: number;
  canRecruit: boolean;
  unavailableMessage: string | null;
};

type CampaignCommandCenterProps = {
  belowMap?: ReactNode;
  belowSidebar?: ReactNode;
  campaignId: string;
  mapWidth: number;
  mapHeight: number;
  mapTemplate: string;
  players: CommandPlayer[];
  territories: CommandTerritory[];
  adjacencies: CommandAdjacency[];
  contestedTerritoryIds: string[];
  currentPlayerId: string | null;
  canSubmitOrders: boolean;
  unavailableMessage: string | null;
  existingOrder: ExistingOrder | null;
  recruitment: RecruitmentState;
};

const neutralTerritoryColor = "#c8bca7";
const neutralTerritoryFill = "#f2eee5";
const contestedTerritoryColor = "#9f2f45";
const contestedTerritoryFill = "#68221f";
const mapBoardBaseColor = "#0a1214";
const mapTileLightText = "#fffaf0";
const mapTileDarkText = "#120f0c";
const hexClipPath = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
const hexTileWidth = 136;
const hexTileHeight = 144;
const hexRowOffset = hexTileWidth / 2;
const hexVerticalOverlap = hexTileHeight / 4;

const territoryTypeMarks: Record<string, string> = {
  capital: "CA",
  village: "VI",
  mine: "GE",
  ruins: "RU",
  fort: "FO",
  magic_tower: "TO",
  dragon: "DR",
  giant: "GI",
  wild: "SA",
};
const fortifyOrderTooltip =
  "Fortifier donne +200 points d'armée au défenseur si ce territoire est attaqué. La fortification est retirée après la bataille.";

const territoryTypeBadgeStyles: Record<
  string,
  { background: string; borderColor: string }
> = {
  capital: {
    background: "linear-gradient(180deg, #9f722c, #4d3012)",
    borderColor: "#f3d58c",
  },
  village: {
    background: "linear-gradient(180deg, #315c8c, #142b45)",
    borderColor: "#9dc4ee",
  },
  mine: {
    background: "linear-gradient(180deg, #476d28, #1f3511)",
    borderColor: "#b8df82",
  },
  ruins: {
    background: "linear-gradient(180deg, #77756b, #363633)",
    borderColor: "#d8d3bd",
  },
  fort: {
    background: "linear-gradient(180deg, #a75b20, #4c230c)",
    borderColor: "#efb26b",
  },
  magic_tower: {
    background: "linear-gradient(180deg, #7a336f, #32152e)",
    borderColor: "#dca8d7",
  },
  dragon: {
    background: "linear-gradient(180deg, #6f3d86, #28163b)",
    borderColor: "#caa3ef",
  },
  giant: {
    background: "linear-gradient(180deg, #6d5e4f, #33291f)",
    borderColor: "#d8c0a2",
  },
  wild: {
    background: "linear-gradient(180deg, #8b793d, #433816)",
    borderColor: "#e5d18b",
  },
};

const territoryTypeLegend = [
  { type: "capital", label: "Capitale" },
  { type: "village", label: "Village" },
  { type: "mine", label: "Gisement" },
  { type: "ruins", label: "Ruines" },
  { type: "fort", label: "Forteresse" },
  { type: "magic_tower", label: "Tour arcanique" },
  { type: "dragon", label: "Dragons" },
  { type: "giant", label: "Géants" },
  { type: "wild", label: "Sauvage" },
];

function getTerritoryTypeMark(type: string) {
  return territoryTypeMarks[type] ?? type.slice(0, 2).toUpperCase();
}

function TerritoryTypeBadge({ type }: { type: string }) {
  return (
    <span
      className="hex-type-badge shrink-0"
      style={{
        clipPath: hexClipPath,
        ...(territoryTypeBadgeStyles[type] ?? territoryTypeBadgeStyles.wild),
      }}
    >
      {getTerritoryTypeMark(type)}
    </span>
  );
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
      className="inline-block size-3 rounded-sm border border-[#f1dfab]/70"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

function ConquestSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="fantasy-action-button w-full gap-2"
      disabled={pending}
      aria-live="polite"
    >
      {pending ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          Enregistrement...
        </>
      ) : (
        "Conquérir"
      )}
    </Button>
  );
}

function FortifySubmitButton() {
  const { pending } = useFormStatus();
  const tooltipId = "fortify-order-tooltip";

  return (
    <div className="group relative w-full">
      <Button
        type="submit"
        variant="outlineDark"
        className="fantasy-action-button w-full gap-2 border-[#2f5f91] bg-[#17456d] text-[#f4e6c8] hover:bg-[#1f5786]"
        disabled={pending}
        aria-describedby={tooltipId}
        aria-live="polite"
      >
        {pending ? (
          <>
            <span
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            Enregistrement...
          </>
        ) : (
          <>
            Fortifier
            <span
              className="inline-flex size-5 items-center justify-center rounded-full border border-[#f3d58c]/70 bg-[#0f1718]/45 text-xs font-bold text-[#f3d58c]"
              aria-hidden="true"
            >
              ?
            </span>
          </>
        )}
      </Button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 w-full rounded-md border border-[#d5a653]/60 bg-[#111819] px-3 py-2 text-left text-xs leading-relaxed text-[#f4e6c8] opacity-0 shadow-xl shadow-black/30 transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {fortifyOrderTooltip}
      </span>
    </div>
  );
}

export function CampaignCommandCenter({
  belowMap,
  belowSidebar,
  campaignId,
  mapWidth,
  mapHeight,
  mapTemplate,
  players,
  territories,
  adjacencies,
  contestedTerritoryIds,
  currentPlayerId,
  canSubmitOrders,
  unavailableMessage,
  existingOrder,
  recruitment,
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
  const [activeLegendType, setActiveLegendType] = useState<string | null>(null);
  const isHexMap = mapTemplate.startsWith("hex_");

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
  const territoryRows = useMemo(() => {
    const rows = new Map<number, CommandTerritory[]>();

    for (const territory of territories) {
      const row = rows.get(territory.positionY) ?? [];
      row.push(territory);
      rows.set(territory.positionY, row);
    }

    return [...rows.entries()]
      .sort(([leftY], [rightY]) => leftY - rightY)
      .map(([positionY, rowTerritories]) => [
        positionY,
        rowTerritories.sort(
          (left, right) => left.positionX - right.positionX,
        ),
      ] as const);
  }, [territories]);

  const selectedTerritory = selectedTerritoryId
    ? (territoryById.get(selectedTerritoryId) ?? territories[0] ?? null)
    : (territories[0] ?? null);
  const activeLegend =
    territoryTypeLegend.find((item) => item.type === activeLegendType) ?? null;
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
  const adjacentControlledCountForSelectedTarget =
    conquestSourcesForSelectedTarget.length;
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

  function renderTerritoryButton(territory: CommandTerritory, mode: "hex" | "square") {
    const owner = territory.ownerCampaignPlayerId
      ? playersById.get(territory.ownerCampaignPlayerId)
      : null;
    const isSelected = territory.id === selectedTerritory?.id;
    const isContested = contestedTerritoryIdSet.has(territory.id);
    const ownerRawColor = isContested
      ? contestedTerritoryColor
      : (owner?.color ?? neutralTerritoryColor);
    const ownerAccentColor = isContested
      ? contestedTerritoryColor
      : getVisibleAccentColor(ownerRawColor, {
          mapBackground: mapBoardBaseColor,
        });
    const isOwnedByCurrentPlayer = owner?.id === currentPlayerId;
    const isConquerableByCurrentPlayer =
      canSubmitOrders &&
      !isOwnedByCurrentPlayer &&
      controlledTerritories.some((sourceTerritory) =>
        adjacentCodesByCode
          .get(sourceTerritory.code)
          ?.has(territory.code),
      );
    const territoryColor =
      isSelected && isConquerableByCurrentPlayer
        ? "#79a83d"
        : ownerAccentColor;
    const tileBackgroundColor = isContested
      ? contestedTerritoryFill
      : owner?.color
        ? blendHexColors(owner.color, mapBoardBaseColor, 0.42)
        : neutralTerritoryFill;
    const tileTextColor = getReadableTextColor(tileBackgroundColor, {
      lightText: mapTileLightText,
      darkText: mapTileDarkText,
    });
    const tileTextShadow =
      tileTextColor === mapTileLightText
        ? "0 1px 1px rgb(0 0 0 / 72%)"
        : "0 1px 0 rgb(255 250 240 / 42%)";
    const ownerLabel = isContested
      ? "Bataille en cours"
      : (owner?.displayName ?? "Neutre");

    const typeBadge = <TerritoryTypeBadge type={territory.type} />;
    const ownerLine = (
      <span
        className="flex min-w-0 max-w-full items-center gap-2 font-semibold"
        style={{ color: tileTextColor, textShadow: tileTextShadow }}
      >
        <span
          className="inline-block size-2.5 shrink-0 rounded-sm border"
          style={{
            backgroundColor: ownerRawColor,
            borderColor: tileTextColor,
          }}
          aria-hidden="true"
        />
        <span className="truncate">{ownerLabel}</span>
      </span>
    );
    const statusBadges =
      isContested || territory.isFortified ? (
        <>
          {isContested ? (
            <span className="rounded-md border border-[#f0674f] bg-[#3a1513] px-2 py-1 text-[11px] font-semibold text-[#ffd8c9]">
              Bataille
            </span>
          ) : null}
          {territory.isFortified ? (
            <span className="rounded-md border border-[#d5a653] bg-[#2b2214] px-2 py-1 text-[11px] font-semibold text-[#f7d78a]">
              Fortifié
            </span>
          ) : null}
        </>
      ) : null;

    const hexContent = (
      <>
        <span className="flex min-h-9 items-start justify-center gap-1.5">
          {typeBadge}
          {territory.isFortified ? (
            <span className="rounded-md border border-[#d5a653] bg-[#2b2214] px-1.5 py-0.5 text-[10px] font-semibold text-[#f7d78a]">
              Fortifié
            </span>
          ) : null}
        </span>
        <span
          className="my-auto line-clamp-2 px-1 text-center text-[13px] font-bold leading-[15px]"
          style={{ color: tileTextColor, textShadow: tileTextShadow }}
        >
          {territory.name}
        </span>
        <span className="flex min-h-5 justify-center text-[11px] leading-none">
          {ownerLine}
        </span>
      </>
    );

    const squareContent = (
      <>
        <span className="flex items-start justify-between gap-2">
          <span
            className="line-clamp-2 min-h-10 font-semibold leading-5"
            style={{ color: tileTextColor, textShadow: tileTextShadow }}
          >
            {territory.name}
          </span>
          {typeBadge}
        </span>
        <span className="mt-2 text-xs">{ownerLine}</span>
        {statusBadges ? (
          <span className="mt-3 flex flex-wrap gap-1">{statusBadges}</span>
        ) : null}
      </>
    );

    if (mode === "hex") {
      return (
        <button
          key={territory.id}
          type="button"
          aria-pressed={isSelected}
          onClick={() => selectTerritory(territory)}
          className={cn(
            "hex-territory h-[144px] w-[136px] shrink-0 p-[4px] text-left text-sm transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4ce73]",
            isSelected && "hex-territory-selected relative z-10",
          )}
          style={{
            backgroundColor: territoryColor,
            clipPath: hexClipPath,
          }}
        >
          <span
            className="hex-territory-inner flex h-full w-full flex-col overflow-hidden px-4 py-4"
            style={{
              backgroundColor: tileBackgroundColor,
              clipPath: hexClipPath,
            }}
          >
            {hexContent}
          </span>
        </button>
      );
    }

    return (
      <button
        key={territory.id}
        type="button"
        aria-pressed={isSelected}
        onClick={() => selectTerritory(territory)}
        className={cn(
          "min-h-28 rounded-md border-2 p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4ce73]",
          isSelected && "shadow-sm shadow-[#f4ce73]/30",
        )}
        style={{
          borderColor: territoryColor,
          backgroundColor: tileBackgroundColor,
          color: tileTextColor,
          boxShadow: isSelected ? "0 0 0 2px #302720" : undefined,
        }}
      >
        {squareContent}
      </button>
    );
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_380px]">
      <div className="min-w-0">
        <Card className="fantasy-panel">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="fantasy-panel-title text-2xl">
                  Carte de campagne
                </CardTitle>
                <CardDescription className="fantasy-muted">
                  {canSubmitOrders
                    ? "Sélectionne un territoire contrôlé sur la carte pour donner ton ordre."
                    : "Clique sur un territoire pour consulter ses informations et les actions disponibles."}
                </CardDescription>
              </div>
              <Badge
                variant="neutral"
                className="border-[#c89a53]/60 bg-[#11191a] text-[#f4ce73]"
              >
                {isHexMap ? "Hex" : "Grille"} {mapWidth} x {mapHeight} -{" "}
                {territories.length} territoires
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="fantasy-map-board overflow-x-auto p-4 pb-6">
              {isHexMap ? (
                <div
                  className="py-3"
                  style={{
                    minWidth: `${mapWidth * hexTileWidth + hexRowOffset}px`,
                  }}
                >
                  {territoryRows.map(([positionY, rowTerritories], index) => (
                    <div
                      key={positionY}
                      className="flex"
                      style={{
                        paddingLeft: positionY % 2 === 0 ? `${hexRowOffset}px` : 0,
                        marginTop: index > 0 ? `-${hexVerticalOverlap}px` : 0,
                      }}
                    >
                      {rowTerritories.map((territory) =>
                        renderTerritoryButton(territory, "hex"),
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${mapWidth}, minmax(112px, 1fr))`,
                    minWidth: `${mapWidth * 118}px`,
                  }}
                >
                  {territories.map((territory) =>
                    renderTerritoryButton(territory, "square"),
                  )}
                </div>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#c9a45d]">
                  Tags
                </span>
                <div
                  className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1"
                  aria-label="Légende des tags de territoire"
                >
                  {territoryTypeLegend.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      className={cn(
                        "inline-flex shrink-0 rounded-md border p-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4ce73]",
                        activeLegendType === item.type
                          ? "border-[#f4ce73] bg-[#3a2b18]"
                          : "border-[#c89a53]/35 bg-[#0b1415]/70 hover:bg-[#d5a653]/12",
                      )}
                      aria-expanded={activeLegendType === item.type}
                      aria-describedby={
                        activeLegendType === item.type
                          ? "territory-type-legend-tooltip"
                          : undefined
                      }
                      title={`${item.label} - ${getTerritoryTypeEffectLabel(item.type)}`}
                      onClick={() => setActiveLegendType(item.type)}
                      onFocus={() => setActiveLegendType(item.type)}
                    >
                      <TerritoryTypeBadge type={item.type} />
                      <span className="sr-only">
                        {getTerritoryTypeMark(item.type)} - {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              {activeLegend ? (
                <p
                  id="territory-type-legend-tooltip"
                  role="tooltip"
                  className="mt-2 rounded-md border border-[#c89a53]/35 bg-[#0b1415]/82 px-3 py-2 text-xs leading-5 text-[#cbbda6]"
                >
                  <span className="font-semibold text-[#f3ead7]">
                    {activeLegend.label}
                  </span>{" "}
                  - {getTerritoryTypeEffectLabel(activeLegend.type)}
                </p>
              ) : null}
            </div>
            {belowMap ? (
              <div className="mt-4 border-t border-[#c89a53]/25 pt-4">
                {belowMap}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="fantasy-panel">
          <CardHeader>
            <CardTitle className="fantasy-panel-title text-2xl">
              {selectedTerritory ? selectedTerritory.name : "Commandement"}
            </CardTitle>
            <CardDescription className="fantasy-muted">
              Territoire sélectionné et actions possibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingOrder ? (
              <div className="fantasy-stat p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#f3ead7]">
                      Ordre actuel
                    </p>
                    <p className="fantasy-muted mt-1 text-sm">
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
                    <Button
                      type="submit"
                      variant="outlineDark"
                      size="sm"
                      className="fantasy-action-button"
                    >
                      Annuler l&apos;ordre
                    </Button>
                  </form>
                ) : null}
              </div>
            ) : null}

            {selectedTerritory ? (
              <dl className="grid gap-3 text-sm">
                <div className="fantasy-stat p-3">
                  <dt className="font-semibold text-[#f3ead7]">Propriétaire</dt>
                  <dd className="fantasy-muted mt-1 space-y-2">
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
                      <div className="inline-flex rounded-md border border-[#f0674f] bg-[#3a1513] px-2 py-1 text-xs font-semibold text-[#ffd8c9]">
                        Bataille en cours
                      </div>
                    ) : null}
                  </dd>
                </div>
                <div className="fantasy-stat p-3">
                  <dt className="font-semibold text-[#f3ead7]">Effet</dt>
                  <dd className="fantasy-muted mt-1">
                    {getTerritoryTypeEffectLabel(selectedTerritory.type)}
                  </dd>
                </div>
              </dl>
            ) : null}

            {unavailableMessage ? (
              <p className="fantasy-alert p-3 text-sm">
                {unavailableMessage}
              </p>
            ) : null}

            {canSubmitOrders && selectedTerritory ? (
              <div className="space-y-3">
                {isSelectedControlled ? (
                  <>
                    {selectedTerritory.type === "fort" ? (
                      <p className="fantasy-alert fantasy-alert-info p-3 text-sm">
                        Cette forteresse donne déjà le bonus défensif de +200
                        points. Elle ne peut pas être fortifiée davantage.
                      </p>
                    ) : selectedTerritory.isFortified ? (
                      <p className="fantasy-alert fantasy-alert-info p-3 text-sm">
                        Ce territoire est déjà fortifié.
                      </p>
                    ) : (
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
                        <FortifySubmitButton />
                      </form>
                    )}

                    {selectedValidConquestTargets.length ? (
                      <div className="fantasy-alert fantasy-alert-info p-3 text-sm">
                        <p className="font-semibold">Cibles à portée</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedValidConquestTargets.map((territory) => (
                            <button
                              key={territory.id}
                              type="button"
                              className="rounded-md border border-[#87b75c] bg-[#263f19] px-2 py-1 text-left text-xs font-semibold text-[#e6f6cf] transition hover:bg-[#315022]"
                              onClick={() => selectTerritory(territory)}
                            >
                              {territory.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="fantasy-alert p-3 text-sm">
                        Aucune cible adjacente disponible depuis ce territoire.
                      </p>
                    )}
                  </>
                ) : canConquerSelectedTerritory && conquestSourceForSelectedTarget ? (
                  <>
                    <p className="fantasy-alert fantasy-alert-info p-3 text-sm">
                      {selectedTerritory.ownerCampaignPlayerId
                        ? "Ce territoire appartient à un adversaire : l'ordre créera une bataille."
                        : getNeutralConquestDifficultyLabel(
                            selectedTerritory.type,
                            adjacentControlledCountForSelectedTarget,
                          )}
                    </p>
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
                      <ConquestSubmitButton />
                    </form>
                  </>
                ) : (
                  <p className="fantasy-alert p-3 text-sm">
                    Cette zone ne peut pas être conquise depuis tes territoires
                    actuels.
                  </p>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <LegendaryRecruitmentCard
          campaignId={campaignId}
          glory={recruitment.glory}
          dragonTerritoryCount={recruitment.dragonTerritoryCount}
          giantTerritoryCount={recruitment.giantTerritoryCount}
          dragonRecruits={recruitment.dragonRecruits}
          giantRecruits={recruitment.giantRecruits}
          canRecruit={recruitment.canRecruit}
          unavailableMessage={recruitment.unavailableMessage}
        />
        {belowSidebar}
      </div>
    </div>
  );
}
