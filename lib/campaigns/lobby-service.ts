import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  PLAYER_COLOR_OPTIONS,
  getColorLabel,
} from "@/lib/campaigns/join-campaign";
import { getMapConfig, isSupportedPlayerCount } from "@/lib/maps/map-configs";
import type { Database } from "@/types/database";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignPlayerRow =
  Database["public"]["Tables"]["campaign_players"]["Row"];

export type LobbySettingsInput = {
  displayName: string;
  aosFaction: string;
  color: string;
  startingCapitalCode: string;
};

export type LobbyLaunchChecks = {
  canLaunch: boolean;
  blockers: string[];
};

export type LobbyData = {
  campaign: CampaignRow;
  players: CampaignPlayerRow[];
  activePlayers: CampaignPlayerRow[];
  pendingPlayers: CampaignPlayerRow[];
  currentPlayer: CampaignPlayerRow | null;
  isGameMaster: boolean;
  colorOptions: { label: string; value: string }[];
  capitalOptions: { label: string; value: string }[];
  launchChecks: LobbyLaunchChecks;
};

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

function hasCompleteLobbySettings(player: CampaignPlayerRow) {
  return Boolean(
    player.display_name.trim() &&
      player.aos_faction?.trim() &&
      player.color?.trim() &&
      player.starting_capital_code?.trim(),
  );
}

function getDuplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return [...duplicates];
}

function isColorUsedByAnotherPlayer(
  players: CampaignPlayerRow[],
  color: string,
  playerId: string,
) {
  const normalizedColor = normalizeColor(color);

  return players.some(
    (player) =>
      player.id !== playerId &&
      ["pending", "active"].includes(player.status) &&
      player.color &&
      normalizeColor(player.color) === normalizedColor,
  );
}

function isCapitalUsedByAnotherPlayer(
  players: CampaignPlayerRow[],
  capital: string,
  playerId: string,
) {
  const normalizedCapital = normalizeCapital(capital);

  return players.some(
    (player) =>
      player.id !== playerId &&
      ["pending", "active"].includes(player.status) &&
      player.starting_capital_code &&
      normalizeCapital(player.starting_capital_code) === normalizedCapital,
  );
}

function getColorOptions(players: CampaignPlayerRow[], currentPlayerId?: string) {
  return PLAYER_COLOR_OPTIONS.filter(
    (option) =>
      !currentPlayerId ||
      !isColorUsedByAnotherPlayer(players, option.value, currentPlayerId),
  ).map((option) => ({
    label: option.label,
    value: option.value,
  }));
}

function getCapitalOptions(
  campaign: CampaignRow,
  players: CampaignPlayerRow[],
  currentPlayerId?: string,
) {
  return getCampaignCapitalSlots(campaign)
    .filter(
      (capital) =>
        !currentPlayerId ||
        !isCapitalUsedByAnotherPlayer(players, capital, currentPlayerId),
    )
    .map((capital) => ({
      label: capital,
      value: capital,
    }));
}

function getLobbyLaunchChecks(
  campaign: CampaignRow,
  activePlayers: CampaignPlayerRow[],
): LobbyLaunchChecks {
  const blockers: string[] = [];

  if (campaign.status !== "lobby") {
    blockers.push("La campagne n'est plus en lobby.");
  }

  if (activePlayers.length < campaign.player_count) {
    blockers.push(
      `${campaign.player_count - activePlayers.length} joueur(s) actif(s) manquant(s).`,
    );
  }

  if (activePlayers.length > campaign.player_count) {
    blockers.push("Il y a plus de joueurs actifs que de places prévues.");
  }

  const incompletePlayers = activePlayers.filter(
    (player) => !hasCompleteLobbySettings(player),
  );

  if (incompletePlayers.length) {
    blockers.push(
      `Réglages incomplets : ${incompletePlayers
        .map((player) => player.display_name)
        .join(", ")}.`,
    );
  }

  const notReadyPlayers = activePlayers.filter((player) => !player.is_ready);

  if (notReadyPlayers.length) {
    blockers.push(
      `Pas encore prêt(s) : ${notReadyPlayers
        .map((player) => player.display_name)
        .join(", ")}.`,
    );
  }

  const duplicateColors = getDuplicateValues(
    activePlayers
      .map((player) => player.color)
      .filter((color): color is string => Boolean(color))
      .map(normalizeColor),
  );

  if (duplicateColors.length) {
    blockers.push(
      `Couleur en doublon : ${duplicateColors.map(getColorLabel).join(", ")}.`,
    );
  }

  const duplicateCapitals = getDuplicateValues(
    activePlayers
      .map((player) => player.starting_capital_code)
      .filter((capital): capital is string => Boolean(capital))
      .map(normalizeCapital),
  );

  if (duplicateCapitals.length) {
    blockers.push(`Capitale en doublon : ${duplicateCapitals.join(", ")}.`);
  }

  return {
    canLaunch: blockers.length === 0,
    blockers,
  };
}

function validateSettings(
  campaign: CampaignRow,
  players: CampaignPlayerRow[],
  player: CampaignPlayerRow,
  input: LobbySettingsInput,
) {
  const displayName = normalizeText(input.displayName);
  const aosFaction = normalizeText(input.aosFaction);
  const color = input.color.trim();
  const startingCapitalCode = normalizeCapital(input.startingCapitalCode);
  const knownColor = PLAYER_COLOR_OPTIONS.find(
    (option) => normalizeColor(option.value) === normalizeColor(color),
  );

  if (campaign.status !== "lobby") {
    return { settings: null, error: "Cette campagne n'est plus en lobby." };
  }

  if (!displayName) {
    return { settings: null, error: "Le pseudo est obligatoire." };
  }

  if (!aosFaction) {
    return { settings: null, error: "La faction est obligatoire." };
  }

  if (!knownColor) {
    return { settings: null, error: "Choisis une couleur disponible." };
  }

  if (isColorUsedByAnotherPlayer(players, knownColor.value, player.id)) {
    return { settings: null, error: "Cette couleur est déjà prise." };
  }

  if (!getCampaignCapitalSlots(campaign).includes(startingCapitalCode)) {
    return {
      settings: null,
      error: "Cette capitale n'est pas autorisée pour cette carte.",
    };
  }

  if (isCapitalUsedByAnotherPlayer(players, startingCapitalCode, player.id)) {
    return { settings: null, error: "Cette capitale est déjà prise." };
  }

  return {
    settings: {
      display_name: displayName,
      aos_faction: aosFaction,
      color: knownColor.value,
      starting_capital_code: startingCapitalCode,
    },
    error: null,
  };
}

export async function getLobbyData(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  userId: string,
) {
  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { lobby: null, error: "Campagne introuvable." };
  }

  const { data: players, error: playersError } = await supabase
    .from("campaign_players")
    .select("*")
    .eq("campaign_id", campaignId)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: true });

  if (playersError) {
    return { lobby: null, error: "Impossible de charger le lobby." };
  }

  const lobbyPlayers = players ?? [];
  const activePlayers = lobbyPlayers.filter((player) => player.status === "active");
  const pendingPlayers = lobbyPlayers.filter(
    (player) => player.status === "pending",
  );
  const currentPlayer =
    lobbyPlayers.find((player) => player.user_id === userId) ?? null;
  const isGameMaster = Boolean(
    currentPlayer?.role === "game_master" && currentPlayer.status === "active",
  );

  return {
    lobby: {
      campaign,
      players: lobbyPlayers,
      activePlayers,
      pendingPlayers,
      currentPlayer,
      isGameMaster,
      colorOptions: getColorOptions(lobbyPlayers, currentPlayer?.id),
      capitalOptions: getCapitalOptions(campaign, lobbyPlayers, currentPlayer?.id),
      launchChecks: getLobbyLaunchChecks(campaign, activePlayers),
    } satisfies LobbyData,
    error: null,
  };
}

export async function updateLobbySettings(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  input: LobbySettingsInput,
) {
  const { lobby, error } = await getLobbyData(supabase, campaignId, user.id);

  if (error || !lobby) {
    return { error: error ?? "Lobby introuvable." };
  }

  if (!lobby.currentPlayer) {
    return { error: "Tu ne fais pas partie de cette campagne." };
  }

  const { settings, error: validationError } = validateSettings(
    lobby.campaign,
    lobby.players,
    lobby.currentPlayer,
    input,
  );

  if (validationError || !settings) {
    return { error: validationError ?? "Réglages invalides." };
  }

  const { error: updateError } = await supabase
    .from("campaign_players")
    .update(settings)
    .eq("id", lobby.currentPlayer.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Cette couleur ou cette capitale est déjà prise." };
    }

    return { error: "Impossible d'enregistrer tes réglages." };
  }

  return { error: null };
}

export async function setLobbyReadyState(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  isReady: boolean,
) {
  const { lobby, error } = await getLobbyData(supabase, campaignId, user.id);

  if (error || !lobby) {
    return { error: error ?? "Lobby introuvable." };
  }

  if (!lobby.currentPlayer) {
    return { error: "Tu ne fais pas partie de cette campagne." };
  }

  if (lobby.currentPlayer.status !== "active") {
    return {
      error: "Ta demande doit être validée avant de pouvoir te déclarer prêt.",
    };
  }

  if (isReady && !hasCompleteLobbySettings(lobby.currentPlayer)) {
    return { error: "Complète ton pseudo, ta faction, ta couleur et ta capitale." };
  }

  const { error: updateError } = await supabase
    .from("campaign_players")
    .update({ is_ready: isReady })
    .eq("id", lobby.currentPlayer.id);

  if (updateError) {
    return { error: "Impossible de changer ton statut prêt." };
  }

  return { error: null };
}

export async function reviewJoinRequest(
  supabase: SupabaseClient<Database>,
  user: User,
  campaignId: string,
  playerId: string,
  decision: "approve" | "reject",
) {
  const { lobby, error } = await getLobbyData(supabase, campaignId, user.id);

  if (error || !lobby) {
    return { error: error ?? "Lobby introuvable." };
  }

  if (!lobby.isGameMaster) {
    return { error: "Seul le maître de campagne peut valider les demandes." };
  }

  if (lobby.campaign.status !== "lobby") {
    return { error: "Cette campagne n'est plus en lobby." };
  }

  const targetPlayer = lobby.pendingPlayers.find((player) => player.id === playerId);

  if (!targetPlayer) {
    return { error: "Demande introuvable ou déjà traitée." };
  }

  if (decision === "reject") {
    const { error: updateError } = await supabase
      .from("campaign_players")
      .update({ status: "rejected", is_ready: false })
      .eq("id", targetPlayer.id);

    return {
      error: updateError ? "Impossible de refuser cette demande." : null,
    };
  }

  if (lobby.activePlayers.length >= lobby.campaign.player_count) {
    return { error: "Toutes les places actives sont déjà occupées." };
  }

  if (!hasCompleteLobbySettings(targetPlayer)) {
    return { error: "Ce joueur doit compléter ses réglages avant validation." };
  }

  if (
    targetPlayer.color &&
    isColorUsedByAnotherPlayer(lobby.activePlayers, targetPlayer.color, targetPlayer.id)
  ) {
    return { error: "Cette couleur est déjà prise par un joueur actif." };
  }

  if (
    targetPlayer.starting_capital_code &&
    isCapitalUsedByAnotherPlayer(
      lobby.activePlayers,
      targetPlayer.starting_capital_code,
      targetPlayer.id,
    )
  ) {
    return { error: "Cette capitale est déjà prise par un joueur actif." };
  }

  const { error: updateError } = await supabase
    .from("campaign_players")
    .update({ status: "active", is_ready: false })
    .eq("id", targetPlayer.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Cette couleur ou cette capitale est déjà prise." };
    }

    return { error: "Impossible de valider cette demande." };
  }

  await supabase.from("campaign_logs").insert({
    campaign_id: lobby.campaign.id,
    type: "player_approved",
    title: "Joueur accepté",
    description: `${targetPlayer.display_name} a été accepté dans la campagne.`,
    created_by_user_id: user.id,
  });

  return { error: null };
}
