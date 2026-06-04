import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getMapConfig, isSupportedPlayerCount } from "@/lib/maps/map-configs";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];

type JoinCampaignCampaign = Pick<
  CampaignRow,
  | "id"
  | "name"
  | "invite_code"
  | "status"
  | "current_phase"
  | "season_number"
  | "current_turn_number"
  | "player_count"
  | "map_width"
  | "map_height"
  | "map_template"
  | "created_at"
  | "updated_at"
>;

type JoinCampaignPlayer = Pick<
  CampaignPlayerRow,
  | "id"
  | "display_name"
  | "aos_faction"
  | "color"
  | "status"
  | "starting_capital_code"
> & {
  is_current_user: boolean;
};

export const PLAYER_COLOR_OPTIONS = [
  { label: "Rouge carmin", value: "#b84b35" },
  { label: "Bleu azur", value: "#2f6f9f" },
  { label: "Vert jade", value: "#3f7d4b" },
  { label: "Violet royal", value: "#7251a5" },
  { label: "Or antique", value: "#a77b24" },
  { label: "Noir fer", value: "#302720" },
] as const;

export type PlayerColorOption = (typeof PLAYER_COLOR_OPTIONS)[number];
export type PlayerColorValue = (typeof PLAYER_COLOR_OPTIONS)[number]["value"];

export type JoinCampaignInput = {
  inviteCode: string;
  displayName: string;
  aosFaction: string;
  color: string;
  startingCapitalCode: string;
};

export type JoinCampaignDetails = {
  inviteCode: string;
  campaign: JoinCampaignCampaign | null;
  players: JoinCampaignPlayer[];
  currentPlayer: JoinCampaignPlayer | null;
  activePlayerCount: number;
  reservedPlayerCount: number;
  availableSeatCount: number;
  availableColors: PlayerColorOption[];
  unavailableColors: PlayerColorOption[];
  availableCapitals: string[];
  unavailableCapitals: string[];
  error: string | null;
};

function normalizeInviteCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/g, "");
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeColor(value: string) {
  return value.trim().toLowerCase();
}

function normalizeCapital(value: string) {
  return value.trim().toUpperCase();
}

function getCampaignCapitalSlots(campaign: Pick<CampaignRow, "player_count">) {
  if (!isSupportedPlayerCount(campaign.player_count)) return [];

  return [...getMapConfig(campaign.player_count).capitalSlots] as string[];
}

function getUnavailableColorValues(
  players: Pick<CampaignPlayerRow, "color">[],
) {
  return new Set(
    players
      .map((player) => player.color)
      .filter((color): color is string => Boolean(color))
      .map(normalizeColor),
  );
}

function getUnavailableCapitalValues(
  players: Pick<CampaignPlayerRow, "starting_capital_code">[],
) {
  return new Set(
    players
      .map((player) => player.starting_capital_code)
      .filter((capital): capital is string => Boolean(capital))
      .map(normalizeCapital),
  );
}

function splitAvailableColors(players: Pick<CampaignPlayerRow, "color">[]) {
  const unavailableColorValues = getUnavailableColorValues(players);

  return {
    availableColors: PLAYER_COLOR_OPTIONS.filter(
      (option) => !unavailableColorValues.has(normalizeColor(option.value)),
    ),
    unavailableColors: PLAYER_COLOR_OPTIONS.filter((option) =>
      unavailableColorValues.has(normalizeColor(option.value)),
    ),
  };
}

function splitAvailableCapitals(
  campaign: Pick<CampaignRow, "player_count">,
  players: Pick<CampaignPlayerRow, "starting_capital_code">[],
) {
  const unavailableCapitalValues = getUnavailableCapitalValues(players);
  const capitalSlots = getCampaignCapitalSlots(campaign);

  return {
    availableCapitals: capitalSlots.filter(
      (capital) => !unavailableCapitalValues.has(normalizeCapital(capital)),
    ),
    unavailableCapitals: capitalSlots.filter((capital) =>
      unavailableCapitalValues.has(normalizeCapital(capital)),
    ),
  };
}

export function getColorLabel(value: string) {
  return (
    PLAYER_COLOR_OPTIONS.find(
      (option) => normalizeColor(option.value) === normalizeColor(value),
    )?.label ?? value
  );
}

export function getDisplayNameFromUser(user: User) {
  const metadataName = user.user_metadata.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return normalizeText(metadataName);
  }

  return user.email?.split("@")[0] ?? "Joueur";
}

export async function getJoinCampaignDetails(
  supabase: SupabaseClient<Database>,
  rawInviteCode: string,
): Promise<JoinCampaignDetails> {
  const inviteCode = normalizeInviteCode(rawInviteCode);

  const emptyDetails: JoinCampaignDetails = {
    inviteCode,
    campaign: null,
    players: [],
    currentPlayer: null,
    activePlayerCount: 0,
    reservedPlayerCount: 0,
    availableSeatCount: 0,
    availableColors: [...PLAYER_COLOR_OPTIONS],
    unavailableColors: [],
    availableCapitals: [],
    unavailableCapitals: [],
    error: null,
  };

  if (!inviteCode) {
    return { ...emptyDetails, error: "Saisis un code invitation." };
  }

  const { data, error: detailsError } = await supabase.rpc(
    "get_join_campaign_details",
    {
      target_invite_code: inviteCode,
    },
  );

  if (detailsError) {
    return {
      ...emptyDetails,
      error:
        "La fonction SQL d'invitation n'est pas encore installée dans Supabase.",
    };
  }

  const result = data?.[0];

  if (!result?.success || !result.campaign) {
    return {
      ...emptyDetails,
      error:
        result?.error ?? "Aucune campagne ne correspond à ce code invitation.",
    };
  }

  const campaign = result.campaign as unknown as JoinCampaignCampaign;
  const currentPlayers = Array.isArray(result.players)
    ? (result.players as unknown as JoinCampaignPlayer[])
    : [];
  const currentPlayer =
    currentPlayers.find((player) => player.is_current_user) ?? null;
  const activePlayerCount = currentPlayers.filter(
    (player) => player.status === "active",
  ).length;
  const reservedPlayerCount = currentPlayers.length;
  const availableSeatCount = Math.max(
    campaign.player_count - reservedPlayerCount,
    0,
  );
  const { availableColors, unavailableColors } =
    splitAvailableColors(currentPlayers);
  const { availableCapitals, unavailableCapitals } = splitAvailableCapitals(
    campaign,
    currentPlayers,
  );

  if (campaign.status !== "lobby") {
    return {
      inviteCode,
      campaign,
      players: currentPlayers,
      currentPlayer,
      activePlayerCount,
      reservedPlayerCount,
      availableSeatCount,
      availableColors,
      unavailableColors,
      availableCapitals,
      unavailableCapitals,
      error: "Cette campagne n'est plus en lobby.",
    };
  }

  if (!currentPlayer && reservedPlayerCount >= campaign.player_count) {
    return {
      inviteCode,
      campaign,
      players: currentPlayers,
      currentPlayer,
      activePlayerCount,
      reservedPlayerCount,
      availableSeatCount,
      availableColors,
      unavailableColors,
      availableCapitals,
      unavailableCapitals,
      error: "Cette campagne est pleine ou toutes les places sont demandées.",
    };
  }

  return {
    inviteCode,
    campaign,
    players: currentPlayers,
    currentPlayer,
    activePlayerCount,
    reservedPlayerCount,
    availableSeatCount,
    availableColors,
    unavailableColors,
    availableCapitals,
    unavailableCapitals,
    error: null,
  };
}

export async function joinCampaign(
  supabase: SupabaseClient<Database>,
  _user: User,
  input: JoinCampaignInput,
) {
  const inviteCode = normalizeInviteCode(input.inviteCode);
  const displayName = normalizeText(input.displayName);
  const aosFaction = normalizeText(input.aosFaction);
  const color = input.color.trim();
  const normalizedColor = normalizeColor(color);
  const startingCapitalCode = normalizeCapital(input.startingCapitalCode);

  if (!inviteCode) {
    return { campaignId: null, error: "Le code invitation est obligatoire." };
  }

  if (!displayName) {
    return { campaignId: null, error: "Le pseudo est obligatoire." };
  }

  if (!aosFaction) {
    return { campaignId: null, error: "La faction est obligatoire." };
  }

  if (!color) {
    return { campaignId: null, error: "Choisis une couleur." };
  }

  if (!startingCapitalCode) {
    return { campaignId: null, error: "Choisis une capitale." };
  }

  if (
    !PLAYER_COLOR_OPTIONS.some(
      (option) => normalizeColor(option.value) === normalizedColor,
    )
  ) {
    return { campaignId: null, error: "Cette couleur n'est pas disponible." };
  }

  const { data, error: requestError } = await supabase.rpc(
    "request_join_campaign",
    {
      target_invite_code: inviteCode,
      submitted_display_name: displayName,
      submitted_aos_faction: aosFaction,
      submitted_color: color,
      submitted_starting_capital_code: startingCapitalCode,
    },
  );

  if (requestError) {
    return {
      campaignId: null,
      error:
        "La fonction SQL d'invitation n'est pas encore installée dans Supabase.",
    };
  }

  const result = data?.[0];

  if (!result?.success || !result.campaign_id) {
    return {
      campaignId: null,
      error: result?.error ?? "Impossible d'envoyer la demande pour le moment.",
    };
  }

  return { campaignId: result.campaign_id, error: null };
}
