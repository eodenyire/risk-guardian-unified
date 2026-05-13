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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      controls: {
        Row: {
          control_type: string
          created_at: string
          description: string | null
          effectiveness: string
          frequency: string
          id: string
          last_tested_at: string | null
          name: string
          next_test_due: string | null
          owner: string | null
          risk_type_id: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          control_type?: string
          created_at?: string
          description?: string | null
          effectiveness?: string
          frequency?: string
          id?: string
          last_tested_at?: string | null
          name: string
          next_test_due?: string | null
          owner?: string | null
          risk_type_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          control_type?: string
          created_at?: string
          description?: string | null
          effectiveness?: string
          frequency?: string
          id?: string
          last_tested_at?: string | null
          name?: string
          next_test_due?: string | null
          owner?: string | null
          risk_type_id?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controls_risk_type_id_fkey"
            columns: ["risk_type_id"]
            isOneToOne: false
            referencedRelation: "risk_types"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          connection_config: Json
          created_at: string
          description: string | null
          error_message: string | null
          id: string
          integration_status: string
          last_sync_at: string | null
          location: string | null
          name: string
          records_synced: number
          source_type: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          connection_config?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          integration_status?: string
          last_sync_at?: string | null
          location?: string | null
          name: string
          records_synced?: number
          source_type: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          connection_config?: Json
          created_at?: string
          description?: string | null
          error_message?: string | null
          id?: string
          integration_status?: string
          last_sync_at?: string | null
          location?: string | null
          name?: string
          records_synced?: number
          source_type?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      kri_register: {
        Row: {
          amber_threshold: number
          created_at: string
          current_value: number
          description: string | null
          direction: string
          frequency: string
          green_threshold: number
          id: string
          last_measured_at: string | null
          metric_unit: string
          name: string
          owner: string | null
          red_threshold: number
          risk_type_id: string | null
          source: string
          status: string
          trend: string
          updated_at: string
        }
        Insert: {
          amber_threshold?: number
          created_at?: string
          current_value?: number
          description?: string | null
          direction?: string
          frequency?: string
          green_threshold?: number
          id?: string
          last_measured_at?: string | null
          metric_unit?: string
          name: string
          owner?: string | null
          red_threshold?: number
          risk_type_id?: string | null
          source?: string
          status?: string
          trend?: string
          updated_at?: string
        }
        Update: {
          amber_threshold?: number
          created_at?: string
          current_value?: number
          description?: string | null
          direction?: string
          frequency?: string
          green_threshold?: number
          id?: string
          last_measured_at?: string | null
          metric_unit?: string
          name?: string
          owner?: string | null
          red_threshold?: number
          risk_type_id?: string | null
          source?: string
          status?: string
          trend?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kri_register_risk_type_id_fkey"
            columns: ["risk_type_id"]
            isOneToOne: false
            referencedRelation: "risk_types"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string
          id: string
          industry: string | null
          legal_name: string | null
          logo_url: string | null
          name: string
          physical_address: string | null
          postal_address: string | null
          region: string | null
          registration_number: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name: string
          physical_address?: string | null
          postal_address?: string | null
          region?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string
          id?: string
          industry?: string | null
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          physical_address?: string | null
          postal_address?: string | null
          region?: string | null
          registration_number?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rcsa_assessments: {
        Row: {
          approved_at: string | null
          approver: string | null
          assessor: string | null
          business_unit: string
          control_score: number
          created_at: string
          due_date: string | null
          id: string
          inherent_score: number
          notes: string | null
          period: string
          residual_score: number
          risk_type_id: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver?: string | null
          assessor?: string | null
          business_unit: string
          control_score?: number
          created_at?: string
          due_date?: string | null
          id?: string
          inherent_score?: number
          notes?: string | null
          period: string
          residual_score?: number
          risk_type_id?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver?: string | null
          assessor?: string | null
          business_unit?: string
          control_score?: number
          created_at?: string
          due_date?: string | null
          id?: string
          inherent_score?: number
          notes?: string | null
          period?: string
          residual_score?: number
          risk_type_id?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rcsa_assessments_risk_type_id_fkey"
            columns: ["risk_type_id"]
            isOneToOne: false
            referencedRelation: "risk_types"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_register: {
        Row: {
          created_at: string
          description: string | null
          id: string
          impact: number
          likelihood: number
          mitigation: string | null
          owner: string | null
          residual_risk_level: string | null
          risk_level: string
          risk_score: number | null
          risk_type_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          residual_risk_level?: string | null
          risk_level?: string
          risk_score?: number | null
          risk_type_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          impact?: number
          likelihood?: number
          mitigation?: string | null
          owner?: string | null
          residual_risk_level?: string | null
          risk_level?: string
          risk_score?: number | null
          risk_type_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_register_risk_type_id_fkey"
            columns: ["risk_type_id"]
            isOneToOne: false
            referencedRelation: "risk_types"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_types: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner: string | null
          risk_level: string
          risk_score: number
          trend: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner?: string | null
          risk_level?: string
          risk_score?: number
          trend?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner?: string | null
          risk_level?: string
          risk_score?: number
          trend?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_log: {
        Row: {
          completed_at: string | null
          data_source_id: string | null
          error_details: Json | null
          id: string
          records_failed: number
          records_processed: number
          started_at: string
          status: string
          sync_type: string
          target_system: string | null
        }
        Insert: {
          completed_at?: string | null
          data_source_id?: string | null
          error_details?: Json | null
          id?: string
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          sync_type?: string
          target_system?: string | null
        }
        Update: {
          completed_at?: string | null
          data_source_id?: string | null
          error_details?: Json | null
          id?: string
          records_failed?: number
          records_processed?: number
          started_at?: string
          status?: string
          sync_type?: string
          target_system?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_log_data_source_id_fkey"
            columns: ["data_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "member" | "viewer"
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
  public: {
    Enums: {
      app_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const
