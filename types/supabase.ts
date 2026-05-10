export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_suggestions: {
        Row: {
          content_hash: string
          created_at: string
          id: string
          input_snapshot: Json | null
          model: string | null
          output: Json
          prompt_version: string
          suggestion_type: string
          target_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          model?: string | null
          output: Json
          prompt_version: string
          suggestion_type: string
          target_id?: string | null
          target_type: string
          user_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          model?: string | null
          output?: Json
          prompt_version?: string
          suggestion_type?: string
          target_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_runs: {
        Row: {
          analysis_type: string
          crate_id: string | null
          created_at: string
          id: string
          input_snapshot: Json | null
          reference_track_id: string | null
          rules_version: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          crate_id?: string | null
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          reference_track_id?: string | null
          rules_version: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          crate_id?: string | null
          created_at?: string
          id?: string
          input_snapshot?: Json | null
          reference_track_id?: string | null
          rules_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_runs_crate_id_fkey"
            columns: ["crate_id"]
            isOneToOne: false
            referencedRelation: "crates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_runs_reference_track_id_fkey"
            columns: ["reference_track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_track_results: {
        Row: {
          analysis_run_id: string
          created_at: string
          id: string
          reasons: Json | null
          result_type: string | null
          score: number | null
          track_id: string
        }
        Insert: {
          analysis_run_id: string
          created_at?: string
          id?: string
          reasons?: Json | null
          result_type?: string | null
          score?: number | null
          track_id: string
        }
        Update: {
          analysis_run_id?: string
          created_at?: string
          id?: string
          reasons?: Json | null
          result_type?: string | null
          score?: number | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_track_results_analysis_run_id_fkey"
            columns: ["analysis_run_id"]
            isOneToOne: false
            referencedRelation: "analysis_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_track_results_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      crate_tracks: {
        Row: {
          added_at: string
          crate_id: string
          id: string
          position: number | null
          set_phase: string | null
          track_id: string
        }
        Insert: {
          added_at?: string
          crate_id: string
          id?: string
          position?: number | null
          set_phase?: string | null
          track_id: string
        }
        Update: {
          added_at?: string
          crate_id?: string
          id?: string
          position?: number | null
          set_phase?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crate_tracks_crate_id_fkey"
            columns: ["crate_id"]
            isOneToOne: false
            referencedRelation: "crates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crate_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      crates: {
        Row: {
          crate_type: string
          created_at: string
          description: string | null
          id: string
          name: string
          source: string
          source_external_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          crate_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          source?: string
          source_external_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          crate_type?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          source?: string
          source_external_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      spotify_connections: {
        Row: {
          access_token: string
          created_at: string
          display_name: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          spotify_user_id: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          display_name?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          display_name?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          spotify_user_id?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_enrichment_values: {
        Row: {
          confidence: number | null
          created_at: string
          field_name: string
          field_value: Json
          id: string
          source: string
          source_payload: Json | null
          track_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          field_name: string
          field_value: Json
          id?: string
          source: string
          source_payload?: Json | null
          track_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          field_name?: string
          field_value?: Json
          id?: string
          source?: string
          source_payload?: Json | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_enrichment_values_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_external_ids: {
        Row: {
          created_at: string
          external_id: string
          external_uri: string | null
          id: string
          source: string
          track_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          external_uri?: string | null
          id?: string
          source: string
          track_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          external_uri?: string | null
          id?: string
          source?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_external_ids_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_notes: {
        Row: {
          created_at: string
          id: string
          note: string
          note_type: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note: string
          note_type?: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          note_type?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_notes_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      track_user_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "user_tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_user_tags_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          canonical_album: string | null
          canonical_artist: string
          canonical_title: string
          created_at: string
          duration_ms: number | null
          id: string
          isrc: string | null
          last_enriched_at: string | null
          popularity: number | null
          spotify_id: string | null
          spotify_uri: string | null
          updated_at: string
        }
        Insert: {
          canonical_album?: string | null
          canonical_artist: string
          canonical_title: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          last_enriched_at?: string | null
          popularity?: number | null
          spotify_id?: string | null
          spotify_uri?: string | null
          updated_at?: string
        }
        Update: {
          canonical_album?: string | null
          canonical_artist?: string
          canonical_title?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          isrc?: string | null
          last_enriched_at?: string | null
          popularity?: number | null
          spotify_id?: string | null
          spotify_uri?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
