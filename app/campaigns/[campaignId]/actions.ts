"use server";

import { redirect } from "next/navigation";
import { recruitLegendaryUnit } from "@/lib/campaigns/recruitment-service";
import {
  getLegendaryRecruitmentCost,
  getLegendaryUnitLabel,
  isLegendaryUnitType,
} from "@/lib/campaigns/recruitment-rules";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToCampaign(campaignId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}?${searchParams.toString()}`);
}

export async function recruitLegendaryUnitAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const unitType = getFormValue(formData, "unitType");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}`);
  }

  const { error } = await recruitLegendaryUnit(
    supabase,
    user,
    campaignId,
    unitType,
  );

  if (error) {
    redirectToCampaign(campaignId, { error });
  }

  redirectToCampaign(campaignId, {
    recruited: getLegendaryUnitLabel(unitType),
    spent: isLegendaryUnitType(unitType)
      ? String(getLegendaryRecruitmentCost(unitType))
      : "",
  });
}
