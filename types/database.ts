export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar: string | null;
          favorite_color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar?: string | null;
          favorite_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar?: string | null;
          favorite_color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          owner_user_id: string;
          status: string;
          current_phase: string;
          season_number: number;
          current_turn_number: number;
          player_count: number;
          map_width: number;
          map_height: number;
          map_template: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          owner_user_id: string;
          status?: string;
          current_phase?: string;
          season_number?: number;
          current_turn_number?: number;
          player_count: number;
          map_width: number;
          map_height: number;
          map_template: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          owner_user_id?: string;
          status?: string;
          current_phase?: string;
          season_number?: number;
          current_turn_number?: number;
          player_count?: number;
          map_width?: number;
          map_height?: number;
          map_template?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      campaign_players: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          display_name: string;
          aos_faction: string | null;
          color: string | null;
          role: string;
          status: string;
          starting_capital_code: string | null;
          glory: number;
          dragon_recruits: number;
          giant_recruits: number;
          is_ready: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          display_name: string;
          aos_faction?: string | null;
          color?: string | null;
          role?: string;
          status?: string;
          starting_capital_code?: string | null;
          glory?: number;
          dragon_recruits?: number;
          giant_recruits?: number;
          is_ready?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          user_id?: string;
          display_name?: string;
          aos_faction?: string | null;
          color?: string | null;
          role?: string;
          status?: string;
          starting_capital_code?: string | null;
          glory?: number;
          dragon_recruits?: number;
          giant_recruits?: number;
          is_ready?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      territories: {
        Row: {
          id: string;
          campaign_id: string;
          code: string;
          name: string;
          type: string;
          position_x: number;
          position_y: number;
          owner_campaign_player_id: string | null;
          is_fortified: boolean;
          has_garrison: boolean;
          local_faction: string | null;
          special_reward_claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          code: string;
          name: string;
          type: string;
          position_x: number;
          position_y: number;
          owner_campaign_player_id?: string | null;
          is_fortified?: boolean;
          has_garrison?: boolean;
          local_faction?: string | null;
          special_reward_claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          code?: string;
          name?: string;
          type?: string;
          position_x?: number;
          position_y?: number;
          owner_campaign_player_id?: string | null;
          is_fortified?: boolean;
          has_garrison?: boolean;
          local_faction?: string | null;
          special_reward_claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      territory_adjacencies: {
        Row: {
          id: string;
          campaign_id: string;
          territory_code: string;
          adjacent_territory_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          territory_code: string;
          adjacent_territory_code: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          territory_code?: string;
          adjacent_territory_code?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      campaign_turns: {
        Row: {
          id: string;
          campaign_id: string;
          season_number: number;
          turn_number: number;
          phase: string;
          army_base_points: number;
          event_name: string | null;
          event_description: string | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          season_number?: number;
          turn_number: number;
          phase?: string;
          army_base_points: number;
          event_name?: string | null;
          event_description?: string | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          season_number?: number;
          turn_number?: number;
          phase?: string;
          army_base_points?: number;
          event_name?: string | null;
          event_description?: string | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          campaign_id: string;
          turn_id: string;
          campaign_player_id: string;
          action_type: string;
          source_territory_id: string | null;
          target_territory_id: string | null;
          status: string;
          submitted_at: string | null;
          revealed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          turn_id: string;
          campaign_player_id: string;
          action_type: string;
          source_territory_id?: string | null;
          target_territory_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          revealed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          turn_id?: string;
          campaign_player_id?: string;
          action_type?: string;
          source_territory_id?: string | null;
          target_territory_id?: string | null;
          status?: string;
          submitted_at?: string | null;
          revealed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      battles: {
        Row: {
          id: string;
          campaign_id: string;
          turn_id: string;
          order_id: string;
          territory_id: string;
          attacker_campaign_player_id: string;
          defender_campaign_player_id: string;
          status: string;
          winner_campaign_player_id: string | null;
          army_base_points: number;
          defender_bonus: string | null;
          result_notes: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          turn_id: string;
          order_id: string;
          territory_id: string;
          attacker_campaign_player_id: string;
          defender_campaign_player_id: string;
          status?: string;
          winner_campaign_player_id?: string | null;
          army_base_points: number;
          defender_bonus?: string | null;
          result_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          turn_id?: string;
          order_id?: string;
          territory_id?: string;
          attacker_campaign_player_id?: string;
          defender_campaign_player_id?: string;
          status?: string;
          winner_campaign_player_id?: string | null;
          army_base_points?: number;
          defender_bonus?: string | null;
          result_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      battle_participants: {
        Row: {
          id: string;
          battle_id: string;
          campaign_id: string;
          campaign_player_id: string;
          order_id: string | null;
          role: string;
          dice_result: number | null;
          advantage_rank: number | null;
          dragon_recruits_committed: number;
          giant_recruits_committed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          battle_id: string;
          campaign_id: string;
          campaign_player_id: string;
          order_id?: string | null;
          role?: string;
          dice_result?: number | null;
          advantage_rank?: number | null;
          dragon_recruits_committed?: number;
          giant_recruits_committed?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          battle_id?: string;
          campaign_id?: string;
          campaign_player_id?: string;
          order_id?: string | null;
          role?: string;
          dice_result?: number | null;
          advantage_rank?: number | null;
          dragon_recruits_committed?: number;
          giant_recruits_committed?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      explorations: {
        Row: {
          id: string;
          campaign_id: string;
          turn_id: string;
          order_id: string;
          campaign_player_id: string;
          territory_id: string;
          status: string;
          dice_result: number | null;
          success: boolean | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          turn_id: string;
          order_id: string;
          campaign_player_id: string;
          territory_id: string;
          status?: string;
          dice_result?: number | null;
          success?: boolean | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          turn_id?: string;
          order_id?: string;
          campaign_player_id?: string;
          territory_id?: string;
          status?: string;
          dice_result?: number | null;
          success?: boolean | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      campaign_logs: {
        Row: {
          id: string;
          campaign_id: string;
          turn_id: string | null;
          type: string;
          title: string;
          description: string | null;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          turn_id?: string | null;
          type: string;
          title: string;
          description?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          turn_id?: string | null;
          type?: string;
          title?: string;
          description?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      campaign_messages: {
        Row: {
          id: string;
          campaign_id: string;
          campaign_player_id: string;
          recipient_campaign_player_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          campaign_player_id: string;
          recipient_campaign_player_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          campaign_player_id?: string;
          recipient_campaign_player_id?: string | null;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_campaign_owner: {
        Args: { target_campaign_id: string };
        Returns: boolean;
      };
      is_campaign_member: {
        Args: { target_campaign_id: string };
        Returns: boolean;
      };
      is_active_campaign_member: {
        Args: { target_campaign_id: string };
        Returns: boolean;
      };
      is_campaign_master: {
        Args: { target_campaign_id: string };
        Returns: boolean;
      };
      get_current_turn_order_visibility: {
        Args: { target_campaign_id: string };
        Returns: {
          campaign_player_id: string;
          display_name: string;
          order_id: string | null;
          order_status: string;
          can_view_details: boolean;
          action_type: string | null;
          source_territory_id: string | null;
          source_territory_code: string | null;
          target_territory_id: string | null;
          target_territory_code: string | null;
          submitted_at: string | null;
        }[];
      };
      get_join_campaign_details: {
        Args: { target_invite_code: string };
        Returns: {
          success: boolean;
          error: string | null;
          campaign: Json | null;
          players: Json;
        }[];
      };
      request_join_campaign: {
        Args: {
          target_invite_code: string;
          submitted_display_name: string;
          submitted_aos_faction: string;
          submitted_color: string;
          submitted_starting_capital_code: string;
        };
        Returns: {
          success: boolean;
          error: string | null;
          campaign_id: string | null;
        }[];
      };
      reveal_current_turn_orders: {
        Args: { target_campaign_id: string };
        Returns: {
          success: boolean;
          error: string | null;
          battle_count: number;
          exploration_count: number;
          fortification_count: number;
          multiple_attack_count: number;
        }[];
      };
      resolve_exploration_result: {
        Args: {
          target_exploration_id: string;
          submitted_dice_result: number;
        };
        Returns: {
          success: boolean;
          error: string | null;
          exploration_success: boolean | null;
        }[];
      };
      resolve_battle_result: {
        Args: {
          target_battle_id: string;
          submitted_winner_campaign_player_id: string;
          submitted_result_notes?: string | null;
          submitted_legendary_losses?: Json;
        };
        Returns: {
          success: boolean;
          error: string | null;
          winner_role: string | null;
        }[];
      };
      commit_legendary_reinforcements: {
        Args: {
          target_battle_id: string;
          submitted_dragon_recruits?: number;
          submitted_giant_recruits?: number;
        };
        Returns: {
          success: boolean;
          error: string | null;
          dragon_recruits_committed: number | null;
          giant_recruits_committed: number | null;
        }[];
      };
      finish_current_turn: {
        Args: { target_campaign_id: string };
        Returns: {
          success: boolean;
          error: string | null;
          next_turn_number: number | null;
          next_army_base_points: number | null;
        }[];
      };
      recruit_legendary_unit: {
        Args: {
          target_campaign_id: string;
          requested_unit_type: string;
        };
        Returns: {
          success: boolean;
          error: string | null;
          unit_type: string | null;
          remaining_glory: number | null;
          dragon_recruits: number | null;
          giant_recruits: number | null;
        }[];
      };
      owns_campaign_player: {
        Args: { target_campaign_player_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
