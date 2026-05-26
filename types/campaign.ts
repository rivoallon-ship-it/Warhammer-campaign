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

export type OrderAction = "attack" | "explore" | "fortify";

export type TerritoryType =
  | "capital"
  | "village"
  | "ruins"
  | "fort"
  | "magic_tower"
  | "dragon"
  | "giant"
  | "wild";
