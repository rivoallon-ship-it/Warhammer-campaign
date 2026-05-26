"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
    redirectWithMessage("/signup", "error", error.message);
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

  if (!email || !password) {
    redirectWithMessage("/login", "error", "Email et mot de passe requis.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage("/login", "error", error.message);
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
