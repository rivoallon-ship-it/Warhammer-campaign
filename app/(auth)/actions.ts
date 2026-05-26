"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/profiles/profile-service";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(
  path: string,
  type: "error" | "success",
  message: string,
) {
  redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Confirme ton email avant de te connecter.";
  }

  if (normalizedMessage.includes("user already registered")) {
    return "Un compte existe déjà avec cet email.";
  }

  if (normalizedMessage.includes("password")) {
    return "Le mot de passe n'est pas accepté.";
  }

  return message;
}

export async function signUpAction(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");
  const displayName = getFormValue(formData, "displayName");

  if (!email || !email.includes("@")) {
    redirectWithMessage("/signup", "error", "Indique une adresse email valide.");
  }

  if (password.length < 6) {
    redirectWithMessage(
      "/signup",
      "error",
      "Le mot de passe doit contenir au moins 6 caractères.",
    );
  }

  if (!displayName) {
    redirectWithMessage("/signup", "error", "Indique un pseudo.");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirectWithMessage("/signup", "error", getAuthErrorMessage(error.message));
  }

  redirectWithMessage(
    "/login",
    "success",
    "Compte créé. Vérifie ton email avant de te connecter.",
  );
}

export async function loginAction(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");
  const nextPath = getFormValue(formData, "next") || "/dashboard";

  if (!email || !password) {
    redirectWithMessage("/login", "error", "Email et mot de passe requis.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage("/login", "error", getAuthErrorMessage(error.message));
  }

  if (data.user) {
    await ensureProfile(supabase, data.user);
  }

  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

  redirect(safeNextPath);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
