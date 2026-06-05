"use client";

import { useFormStatus } from "react-dom";
import { recruitLegendaryUnitAction } from "@/app/campaigns/[campaignId]/actions";
import {
  LEGENDARY_RECRUITMENT_COST,
  getLegendaryUnitLabel,
  type LegendaryUnitType,
} from "@/lib/campaigns/recruitment-rules";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";

type LegendaryRecruitmentCardProps = {
  campaignId: string;
  glory: number;
  dragonTerritoryCount: number;
  giantTerritoryCount: number;
  dragonRecruits: number;
  giantRecruits: number;
  canRecruit: boolean;
};

type RecruitButtonProps = {
  unitType: LegendaryUnitType;
  disabled: boolean;
};

function RecruitButton({ unitType, disabled }: RecruitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      className="fantasy-action-button w-full"
      disabled={disabled || pending}
    >
      {pending ? "Recrutement..." : `Recruter ${getLegendaryUnitLabel(unitType)}`}
    </Button>
  );
}

type RecruitmentRowProps = {
  campaignId: string;
  unitType: LegendaryUnitType;
  territoryCount: number;
  recruitCount: number;
  glory: number;
  canRecruit: boolean;
};

function RecruitmentRow({
  campaignId,
  unitType,
  territoryCount,
  recruitCount,
  glory,
  canRecruit,
}: RecruitmentRowProps) {
  const label = getLegendaryUnitLabel(unitType);
  const hasTerritory = territoryCount > 0;
  const hasEnoughGlory = glory >= LEGENDARY_RECRUITMENT_COST;
  const disabled = !canRecruit || !hasTerritory || !hasEnoughGlory;
  const unavailableMessage = !hasTerritory
    ? `Contrôle un territoire ${label} pour débloquer ce recrutement.`
    : !hasEnoughGlory
      ? `Il faut ${LEGENDARY_RECRUITMENT_COST} Gloire.`
      : null;

  return (
    <div className="fantasy-stat p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-[#f3ead7]">{label}</p>
          <p className="fantasy-muted mt-1 text-xs">
            Coût : {LEGENDARY_RECRUITMENT_COST} Gloire
          </p>
        </div>
        <Badge variant={hasTerritory ? "success" : "neutral"}>
          {territoryCount} territoire{territoryCount > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="info">Recrutés : {recruitCount}</Badge>
        <Badge variant={hasEnoughGlory ? "warning" : "neutral"}>
          Gloire : {glory}
        </Badge>
      </div>

      <form action={recruitLegendaryUnitAction} className="mt-3">
        <input type="hidden" name="campaignId" value={campaignId} />
        <input type="hidden" name="unitType" value={unitType} />
        <RecruitButton unitType={unitType} disabled={disabled} />
      </form>

      {unavailableMessage ? (
        <p className="fantasy-muted mt-2 text-xs leading-5">
          {unavailableMessage}
        </p>
      ) : null}
    </div>
  );
}

export function LegendaryRecruitmentCard({
  campaignId,
  glory,
  dragonTerritoryCount,
  giantTerritoryCount,
  dragonRecruits,
  giantRecruits,
  canRecruit,
}: LegendaryRecruitmentCardProps) {
  return (
    <Card className="fantasy-panel">
      <CardHeader>
        <CardTitle className="fantasy-panel-title">
          Recrutements
        </CardTitle>
        <CardDescription className="fantasy-muted">
          Dépense ta Gloire pour obtenir des renforts légendaires.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <RecruitmentRow
          campaignId={campaignId}
          unitType="dragon"
          territoryCount={dragonTerritoryCount}
          recruitCount={dragonRecruits}
          glory={glory}
          canRecruit={canRecruit}
        />
        <RecruitmentRow
          campaignId={campaignId}
          unitType="giant"
          territoryCount={giantTerritoryCount}
          recruitCount={giantRecruits}
          glory={glory}
          canRecruit={canRecruit}
        />
      </CardContent>
    </Card>
  );
}
