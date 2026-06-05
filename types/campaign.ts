export type CampaignStatus =
  | "lobby"
  | "active"
  | "season_end"
  | "finished"
  | "archived";

export type CampaignPhase =
  | "lobby"
  | "orders"
  | "revealed"
  | "resolving"
  | "end_turn"
  | "season_summary"
  | "finished";

export type CampaignPlayerRole = "player" | "game_master";

export type CampaignPlayerStatus = "pending" | "active" | "rejected" | "left";

export type OrderAction = "conquer" | "fortify";

export type TerritoryType =
  | "capital"
  | "village"
  | "mine"
  | "ruins"
  | "fort"
  | "magic_tower"
  | "dragon"
  | "giant"
  | "wild";
