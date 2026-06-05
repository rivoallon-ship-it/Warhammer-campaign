import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isLegendaryUnitType } from "@/lib/campaigns/recruitment-rules";
import type { Database } from "@/types/database";

type RecruitLegendaryUnitRpcResult =
  Database["public"]["Functions"]["recruit_legendary_unit"]["Returns"][number];

export function getRecruitmentRpcErrorMessage(rpcError: {
  code?: string;
  message?: string;
}) {
  const message = rpcError.message ?? "";

  if (
    rpcError.code === "PGRST202" ||
    message.includes("recruit_legendary_unit")
  ) {
    return "La fonction SQL de recrutement n'est pas encore installée dans Supabase.";
  }

  return "Erreur SQL pendant le recrutement.";
}

export async function recruitLegendaryUnit(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  unitType: string,
) {
  if (!campaignId) {
    return { error: "Campagne manquante.", result: null };
  }

  if (!isLegendaryUnitType(unitType)) {
    return { error: "Type de recrutement invalide.", result: null };
  }

  if (!user.id) {
    return { error: "Utilisateur non connecté.", result: null };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "recruit_legendary_unit",
    {
      target_campaign_id: campaignId,
      requested_unit_type: unitType,
    },
  );

  if (rpcError) {
    return {
      error: getRecruitmentRpcErrorMessage(rpcError),
      result: null,
    };
  }

  const result = data?.[0] as RecruitLegendaryUnitRpcResult | undefined;

  if (!result?.success) {
    return {
      error: result?.error ?? "Recrutement impossible.",
      result: null,
    };
  }

  return { error: null, result };
}
