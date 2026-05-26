"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(type: "profileError" | "profileSuccess", message: string) {
  redirect(`/dashboard?${type}=${encodeURIComponent(message)}`);
}

export async function updateProfileAction(formData: FormData) {
  const displayName = getFormValue(formData, "displayName");
  const favoriteColor = getFormValue(formData, "favoriteColor");
  const avatar = getFormValue(formData, "avatar");

  if (!displayName) {
    redirectWithMessage("profileError", "Le pseudo est obligatoire.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName,
    favorite_color: favoriteColor || null,
    avatar: avatar || null,
  });

  if (profileError) {
    redirectWithMessage(
      "profileError",
      "Impossible de mettre à jour le profil.",
    );
  }

  await supabase.auth.updateUser({
    data: {
      display_name: displayName,
    },
  });

  redirectWithMessage("profileSuccess", "Profil mis à jour.");
}
