import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CampaignPhase,
  CampaignPlayerRole,
  CampaignPlayerStatus,
  CampaignStatus,
} from "@/types/campaign";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];

export type DashboardCampaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  phase: CampaignPhase;
  role: CampaignPlayerRole;
  playerStatus: CampaignPlayerStatus;
  isReady: boolean;
  glory: number;
  playerCount: number;
  seasonNumber: number;
  turnNumber: number;
  mapWidth: number;
  mapHeight: number;
  canDeleteCampaign: boolean;
};

function asCampaignStatus(status: string): CampaignStatus {
  return status as CampaignStatus;
}

function asCampaignPhase(phase: string): CampaignPhase {
  return phase as CampaignPhase;
}

function asPlayerRole(role: string): CampaignPlayerRole {
  return role as CampaignPlayerRole;
}

function asPlayerStatus(status: string): CampaignPlayerStatus {
  return status as CampaignPlayerStatus;
}

function mapDashboardCampaign(
  campaign: CampaignRow,
  player: CampaignPlayerRow,
): DashboardCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    status: asCampaignStatus(campaign.status),
    phase: asCampaignPhase(campaign.current_phase),
    role: asPlayerRole(player.role),
    playerStatus: asPlayerStatus(player.status),
    isReady: player.is_ready,
    glory: player.glory,
    playerCount: campaign.player_count,
    seasonNumber: campaign.season_number,
    turnNumber: campaign.current_turn_number,
    mapWidth: campaign.map_width,
    mapHeight: campaign.map_height,
    canDeleteCampaign: campaign.owner_user_id === player.user_id,
  };
}

export async function getDashboardCampaigns(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data: playerRows, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "active"]);

  if (playersError) {
    return { campaigns: [], error: playersError };
  }

  if (!playerRows.length) {
    return { campaigns: [], error: null };
  }

  const campaignIds = playerRows.map((player) => player.campaign_id);
  const { data: campaignRows, error: campaignsError } = await supabase
    .from("campaigns")
    .select("*")
    .in("id", campaignIds);

  if (campaignsError) {
    return { campaigns: [], error: campaignsError };
  }

  const campaignsById = new Map(
    campaignRows.map((campaign) => [campaign.id, campaign]),
  );

  const campaigns = playerRows
    .map((player) => {
      const campaign = campaignsById.get(player.campaign_id);
      return campaign ? mapDashboardCampaign(campaign, player) : null;
    })
    .filter((campaign): campaign is DashboardCampaign => campaign !== null)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return { campaigns, error: null };
}

export function groupDashboardCampaigns(campaigns: DashboardCampaign[]) {
  return {
    lobby: campaigns.filter((campaign) => campaign.status === "lobby"),
    active: campaigns.filter(
      (campaign) =>
        campaign.status === "active" || campaign.status === "season_end",
    ),
    archived: campaigns.filter(
      (campaign) =>
        campaign.status === "finished" || campaign.status === "archived",
    ),
  };
}
