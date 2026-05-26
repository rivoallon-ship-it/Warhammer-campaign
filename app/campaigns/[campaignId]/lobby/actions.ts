"use server";

import { redirect } from "next/navigation";
import {
  reviewJoinRequest,
  setLobbyReadyState,
  updateLobbySettings,
} from "@/lib/campaigns/lobby-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectToLobby(campaignId: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  redirect(`/campaigns/${campaignId}/lobby?${searchParams.toString()}`);
}

async function getAuthenticatedUser(campaignId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/campaigns/${campaignId}/lobby`);
  }

  return { supabase, user };
}

export async function updateLobbySettingsAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const displayName = getFormValue(formData, "displayName");
  const aosFaction = getFormValue(formData, "aosFaction");
  const color = getFormValue(formData, "color");
  const startingCapitalCode = getFormValue(formData, "startingCapitalCode");
  const { supabase, user } = await getAuthenticatedUser(campaignId);
  const { error } = await updateLobbySettings(supabase, user, campaignId, {
    displayName,
    aosFaction,
    color,
    startingCapitalCode,
  });

  if (error) {
    redirectToLobby(campaignId, { error });
  }

  redirectToLobby(campaignId, { settings: "1" });
}

export async function setLobbyReadyStateAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const isReady = getFormValue(formData, "isReady") === "true";
  const { supabase, user } = await getAuthenticatedUser(campaignId);
  const { error } = await setLobbyReadyState(supabase, user, campaignId, isReady);

  if (error) {
    redirectToLobby(campaignId, { error });
  }

  redirectToLobby(campaignId, { ready: isReady ? "1" : "0" });
}

export async function reviewJoinRequestAction(formData: FormData) {
  const campaignId = getFormValue(formData, "campaignId");
  const playerId = getFormValue(formData, "playerId");
  const decision = getFormValue(formData, "decision");
  const { supabase, user } = await getAuthenticatedUser(campaignId);

  if (decision !== "approve" && decision !== "reject") {
    redirectToLobby(campaignId, { error: "Décision invalide." });
  }

  const reviewDecision = decision as "approve" | "reject";
  const { error } = await reviewJoinRequest(
    supabase,
    user,
    campaignId,
    playerId,
    reviewDecision,
  );

  if (error) {
    redirectToLobby(campaignId, { error });
  }

  redirectToLobby(campaignId, {
    [reviewDecision === "approve" ? "approved" : "rejected"]: "1",
  });
}
