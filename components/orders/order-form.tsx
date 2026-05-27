"use client";

import { useMemo, useState } from "react";
import { submitOrderAction } from "@/app/campaigns/[campaignId]/orders/actions";
import { Badge, Button, Select } from "@/components/ui";
import type { OrderAction } from "@/types/campaign";

type TerritoryOption = {
  id: string;
  code: string;
  name: string;
  type: string;
  ownerCampaignPlayerId: string | null;
  isFortified: boolean;
};

type AdjacencyOption = {
  territoryCode: string;
  adjacentTerritoryCode: string;
};

type ExistingOrder = {
  actionType: string;
  sourceTerritoryId: string | null;
  targetTerritoryId: string | null;
  status: string;
};

type OrderFormProps = {
  campaignId: string;
  currentPlayerId: string;
  actionOptions: { label: string; value: OrderAction }[];
  territories: TerritoryOption[];
  adjacencies: AdjacencyOption[];
  existingOrder: ExistingOrder | null;
};

function isOrderAction(value?: string | null): value is OrderAction {
  return value === "attack" || value === "explore" || value === "fortify";
}

function getTerritoryTypeLabel(type: string) {
  if (type === "capital") return "Capitale";
  if (type === "village") return "Village";
  if (type === "ruins") return "Ruines";
  if (type === "fort") return "Fort";
  if (type === "magic_tower") return "Tour";
  if (type === "dragon") return "Dragon";
  if (type === "giant") return "Géant";
  if (type === "wild") return "Sauvage";

  return type;
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

function getTerritoryLabel(
  territory: TerritoryOption,
  currentPlayerId: string,
) {
  const owner =
    territory.ownerCampaignPlayerId === currentPlayerId
      ? "vous"
      : territory.ownerCampaignPlayerId
        ? "ennemi"
        : "neutre";
  const fortified = territory.isFortified ? ", fortifié" : "";

  return `${territory.code} - ${territory.name} (${getTerritoryTypeLabel(
    territory.type,
  )}, ${owner}${fortified})`;
}

function getOrderSummary(
  existingOrder: ExistingOrder,
  actionOptions: { label: string; value: OrderAction }[],
  territories: TerritoryOption[],
) {
  const actionLabel =
    actionOptions.find((option) => option.value === existingOrder.actionType)?.label ??
    existingOrder.actionType;
  const source = territories.find(
    (territory) => territory.id === existingOrder.sourceTerritoryId,
  );
  const target = territories.find(
    (territory) => territory.id === existingOrder.targetTerritoryId,
  );

  if (existingOrder.actionType === "fortify") {
    return `${actionLabel} ${target?.code ?? "un territoire"}`;
  }

  return `${actionLabel} depuis ${source?.code ?? "?"} vers ${
    target?.code ?? "?"
  }`;
}

export function OrderForm({
  campaignId,
  currentPlayerId,
  actionOptions,
  territories,
  adjacencies,
  existingOrder,
}: OrderFormProps) {
  const [actionType, setActionType] = useState<OrderAction>(
    isOrderAction(existingOrder?.actionType) ? existingOrder.actionType : "attack",
  );
  const [sourceTerritoryId, setSourceTerritoryId] = useState(
    existingOrder?.sourceTerritoryId ?? "",
  );
  const [targetTerritoryId, setTargetTerritoryId] = useState(
    existingOrder?.targetTerritoryId ?? "",
  );

  const controlledTerritories = useMemo(
    () =>
      territories.filter(
        (territory) => territory.ownerCampaignPlayerId === currentPlayerId,
      ),
    [currentPlayerId, territories],
  );

  const sourceOptions = useMemo(
    () =>
      controlledTerritories.map((territory) => ({
        label: getTerritoryLabel(territory, currentPlayerId),
        value: territory.id,
      })),
    [controlledTerritories, currentPlayerId],
  );

  const selectedSourceTerritoryId =
    actionType === "fortify"
      ? ""
      : sourceOptions.some((option) => option.value === sourceTerritoryId)
        ? sourceTerritoryId
        : sourceOptions[0]?.value ?? "";

  const territoryById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory])),
    [territories],
  );

  const sourceTerritory = territoryById.get(selectedSourceTerritoryId);

  const adjacentCodes = useMemo(() => {
    if (!sourceTerritory) return new Set<string>();

    return new Set(
      adjacencies
        .filter(
          (adjacency) => adjacency.territoryCode === sourceTerritory.code,
        )
        .map((adjacency) => adjacency.adjacentTerritoryCode),
    );
  }, [adjacencies, sourceTerritory]);

  const targetTerritories = useMemo(() => {
    if (actionType === "fortify") return controlledTerritories;
    if (!sourceTerritory) return [];

    return territories.filter((territory) => {
      if (!adjacentCodes.has(territory.code)) return false;

      if (actionType === "attack") {
        return (
          territory.ownerCampaignPlayerId !== null &&
          territory.ownerCampaignPlayerId !== currentPlayerId
        );
      }

      return territory.ownerCampaignPlayerId === null;
    });
  }, [
    actionType,
    adjacentCodes,
    controlledTerritories,
    currentPlayerId,
    sourceTerritory,
    territories,
  ]);

  const targetOptions = useMemo(
    () =>
      targetTerritories.map((territory) => ({
        label: getTerritoryLabel(territory, currentPlayerId),
        value: territory.id,
      })),
    [currentPlayerId, targetTerritories],
  );

  const selectedTargetTerritoryId = targetOptions.some(
    (option) => option.value === targetTerritoryId,
  )
    ? targetTerritoryId
    : targetOptions[0]?.value ?? "";
  const selectedTarget = territoryById.get(selectedTargetTerritoryId);
  const canSubmit =
    Boolean(selectedTargetTerritoryId) &&
    (actionType === "fortify" || Boolean(selectedSourceTerritoryId));
  const actionHint =
    actionType === "attack"
      ? "Une attaque cible un territoire ennemi adjacent."
      : actionType === "explore"
        ? "Une exploration cible un territoire neutre adjacent."
        : "La fortification se place sur un territoire que vous contrôlez.";

  return (
    <form action={submitOrderAction} className="space-y-5">
      <input type="hidden" name="campaignId" value={campaignId} />

      {existingOrder ? (
        <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[#302720]">Ordre actuel</p>
              <p className="mt-1 text-sm text-[#6a5e54]">
                {getOrderSummary(existingOrder, actionOptions, territories)}
              </p>
            </div>
            <Badge variant={getOrderStatusVariant(existingOrder.status)}>
              {getOrderStatusLabel(existingOrder.status)}
            </Badge>
          </div>
        </div>
      ) : null}

      <Select
        name="actionType"
        label="Action"
        value={actionType}
        onChange={(event) => setActionType(event.target.value as OrderAction)}
        options={actionOptions}
        hint={actionHint}
      />

      {actionType === "fortify" ? (
        <input type="hidden" name="sourceTerritoryId" value="" />
      ) : (
        <Select
          name="sourceTerritoryId"
          label="Source"
          value={selectedSourceTerritoryId}
          onChange={(event) => setSourceTerritoryId(event.target.value)}
          disabled={!sourceOptions.length}
          options={
            sourceOptions.length
              ? sourceOptions
              : [{ label: "Aucun territoire contrôlé", value: "" }]
          }
        />
      )}

      <Select
        name="targetTerritoryId"
        label={actionType === "fortify" ? "Territoire" : "Cible"}
        value={selectedTargetTerritoryId}
        onChange={(event) => setTargetTerritoryId(event.target.value)}
        disabled={!targetOptions.length}
        options={
          targetOptions.length
            ? targetOptions
            : [{ label: "Aucune cible disponible", value: "" }]
        }
      />

      {selectedTarget ? (
        <div className="rounded-md border border-[#eadfce] bg-[#fffdf8] p-4 text-sm text-[#5d5148]">
          <span className="font-semibold text-[#302720]">
            {selectedTarget.code} - {selectedTarget.name}
          </span>{" "}
          sera la cible enregistrée pour ce tour.
        </div>
      ) : null}

      <Button type="submit" className="w-full" disabled={!canSubmit}>
        {existingOrder ? "Modifier mon ordre" : "Valider mon ordre"}
      </Button>
    </form>
  );
}
