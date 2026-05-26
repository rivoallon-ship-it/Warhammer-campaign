import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

function getDisplayNameFromUser(user: User) {
  const metadataName = user.user_metadata.display_name;

  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0] ?? "Joueur";
  }

  return "Joueur";
}

export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  user: User,
) {
  const fallbackProfile = {
    id: user.id,
    display_name: getDisplayNameFromUser(user),
    avatar: null,
    favorite_color: null,
  };

  const { data: existingProfile, error: selectError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile;
  }

  if (selectError) {
    return null;
  }

  const { data: insertedProfile } = await supabase
    .from("profiles")
    .insert(fallbackProfile)
    .select("*")
    .single();

  return insertedProfile;
}

export async function getProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return { profile: data, error };
}
