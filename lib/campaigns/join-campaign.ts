import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getMapConfig, isSupportedPlayerCount } from "@/lib/maps/map-configs";
import type { Database } from "@/types/database";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignPlayerRow = Database["public"]["Tables"]["campaign_players"]["Row"];

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
  campaign: CampaignRow | null;
  players: CampaignPlayerRow[];
  currentPlayer: CampaignPlayerRow | null;
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

function getCampaignCapitalSlots(campaign: CampaignRow) {
  if (!isSupportedPlayerCount(campaign.player_count)) return [];

  return [...getMapConfig(campaign.player_count).capitalSlots] as string[];
}

function getUnavailableColorValues(players: CampaignPlayerRow[]) {
  return new Set(
    players
      .map((player) => player.color)
      .filter((color): color is string => Boolean(color))
      .map(normalizeColor),
  );
}

function getUnavailableCapitalValues(players: CampaignPlayerRow[]) {
  return new Set(
    players
      .map((player) => player.starting_capital_code)
      .filter((capital): capital is string => Boolean(capital))
      .map(normalizeCapital),
  );
}

function splitAvailableColors(players: CampaignPlayerRow[]) {
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

function splitAvailableCapitals(campaign: CampaignRow, players: CampaignPlayerRow[]) {
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
  userId: string,
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

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("invite_code", inviteCode)
    .maybeSingle();

  if (campaignError) {
    return {
      ...emptyDetails,
      error: "Impossible de vérifier ce code pour le moment.",
    };
  }

  if (!campaign) {
    return { ...emptyDetails, error: "Aucune campagne ne correspond à ce code." };
  }

  const { data: players, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaign.id)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true });

  if (playersError) {
    return {
      ...emptyDetails,
      campaign,
      error: "Impossible de charger les places de cette campagne.",
    };
  }

  const currentPlayers = players ?? [];
  const currentPlayer =
    currentPlayers.find((player) => player.user_id === userId) ?? null;
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
  user: User,
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

  const details = await getJoinCampaignDetails(supabase, inviteCode, user.id);

  if (!details.campaign) {
    return { campaignId: null, error: details.error ?? "Campagne introuvable." };
  }

  if (details.currentPlayer) {
    return { campaignId: details.campaign.id, error: null };
  }

  if (details.error) {
    return { campaignId: null, error: details.error };
  }

  if (
    !PLAYER_COLOR_OPTIONS.some(
      (option) => normalizeColor(option.value) === normalizedColor,
    )
  ) {
    return { campaignId: null, error: "Cette couleur n'est pas disponible." };
  }

  if (
    getUnavailableColorValues(details.players).has(normalizedColor)
  ) {
    return { campaignId: null, error: "Cette couleur est déjà prise." };
  }

  if (!getCampaignCapitalSlots(details.campaign).includes(startingCapitalCode)) {
    return {
      campaignId: null,
      error: "Cette capitale n'est pas autorisée pour cette carte.",
    };
  }

  if (getUnavailableCapitalValues(details.players).has(startingCapitalCode)) {
    return { campaignId: null, error: "Cette capitale est déjà prise." };
  }

  const { error: insertError } = await supabase.from("campaign_players").insert({
    campaign_id: details.campaign.id,
    user_id: user.id,
    display_name: displayName,
    aos_faction: aosFaction,
    color,
    role: "player",
    status: "pending",
    starting_capital_code: startingCapitalCode,
    glory: 0,
    is_ready: false,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        campaignId: null,
        error: "Tu as déjà une entrée dans cette campagne.",
      };
    }

    return {
      campaignId: null,
      error: "Impossible d'envoyer la demande pour le moment.",
    };
  }

  await supabase.from("campaign_logs").insert({
    campaign_id: details.campaign.id,
    type: "player_joined",
    title: "Demande envoyée",
    description: `${displayName} a demandé à rejoindre la campagne.`,
    created_by_user_id: user.id,
  });

  return { campaignId: details.campaign.id, error: null };
}
