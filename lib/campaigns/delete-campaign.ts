import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DeleteCampaignResult = {
  error: string | null;
};

function getDeleteCampaignError(message: string) {
  if (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("not authorized")
  ) {
    return "Suppression refusée par Supabase. Vérifie que la policy Owners delete campaigns est installée.";
  }

  return "Impossible de supprimer la campagne pour le moment.";
}

export async function deleteCampaign(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
): Promise<DeleteCampaignResult> {
  if (!campaignId) {
    return { error: "Campagne introuvable." };
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, owner_user_id")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError) {
    return { error: "Impossible de vérifier la campagne." };
  }

  if (!campaign) {
    return { error: "Campagne introuvable." };
  }

  if (campaign.owner_user_id !== user.id) {
    return { error: "Seul le créateur de la campagne peut la supprimer." };
  }

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("owner_user_id", user.id);

  if (error) {
    return { error: getDeleteCampaignError(error.message) };
  }

  return { error: null };
}
