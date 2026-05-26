import { randomInt } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ensureProfile } from "@/lib/profiles/profile-service";
import { getMapConfig, isSupportedPlayerCount } from "@/lib/maps/map-configs";
import type { Database } from "@/types/database";

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_INVITE_CODE_ATTEMPTS = 8;

type CreateCampaignInput = {
  name: string;
  playerCount: number;
};

function generateInviteCode() {
  return Array.from({ length: 6 })
    .map(() => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)])
    .join("");
}

function getDisplayName(user: User, profileName?: string | null) {
  if (profileName?.trim()) return profileName.trim();

  const metadataName = user.user_metadata.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] ?? "Maître de campagne";
}

export async function createCampaign(
  supabase: SupabaseClient<Database>,
  user: User,
  input: CreateCampaignInput,
) {
  const name = input.name.trim();

  if (!name) {
    return { campaignId: null, error: "Le nom de campagne est obligatoire." };
  }

  if (!isSupportedPlayerCount(input.playerCount)) {
    return {
      campaignId: null,
      error: "Une campagne doit accepter entre 2 et 6 joueurs.",
    };
  }

  const mapConfig = getMapConfig(input.playerCount);
  const profile = await ensureProfile(supabase, user);
  const displayName = getDisplayName(user, profile?.display_name);

  for (let attempt = 0; attempt < MAX_INVITE_CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = generateInviteCode();
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        name,
        invite_code: inviteCode,
        owner_user_id: user.id,
        player_count: input.playerCount,
        map_width: mapConfig.width,
        map_height: mapConfig.height,
        map_template: mapConfig.template,
      })
      .select("*")
      .single();

    if (campaignError) {
      if (campaignError.code === "23505") {
        continue;
      }

      return {
        campaignId: null,
        error: "Impossible de créer la campagne.",
      };
    }

    const { error: playerError } = await supabase.from("campaign_players").insert({
      campaign_id: campaign.id,
      user_id: user.id,
      display_name: displayName,
      role: "game_master",
      status: "active",
      is_ready: false,
      glory: 0,
    });

    if (playerError) {
      await supabase.from("campaigns").delete().eq("id", campaign.id);

      return {
        campaignId: null,
        error: "La campagne a été créée, mais le maître n'a pas pu être ajouté.",
      };
    }

    await supabase.from("campaign_logs").insert({
      campaign_id: campaign.id,
      type: "campaign_created",
      title: "Campagne créée",
      description: `${displayName} a créé la campagne ${name}.`,
      created_by_user_id: user.id,
    });

    return { campaignId: campaign.id, error: null };
  }

  return {
    campaignId: null,
    error: "Impossible de générer un code invitation unique.",
  };
}
