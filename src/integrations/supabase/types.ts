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
  public: {
    Tables: {
      account_members: {
        Row: {
          address: string | null
          buyer_account_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          id: string
          id_document_url: string | null
          role: string
          updated_at: string
          vetting_status: string
        }
        Insert: {
          address?: string | null
          buyer_account_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          role?: string
          updated_at?: string
          vetting_status?: string
        }
        Update: {
          address?: string | null
          buyer_account_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          role?: string
          updated_at?: string
          vetting_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_buyer_account_id_fkey"
            columns: ["buyer_account_id"]
            isOneToOne: false
            referencedRelation: "buyer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action_type: string
          actor_id: string | null
          actor_type: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      buyer_accounts: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          golden_ticket_issued: boolean
          id: string
          intent: string | null
          non_negotiable_amenities: Json
          onboarding_status: string
          phone: string | null
          primary_target_market: string | null
          priority_rank: number | null
          priority_rank_timestamp: string | null
          target_budget: number | null
          target_zip_codes: Json
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          golden_ticket_issued?: boolean
          id?: string
          intent?: string | null
          non_negotiable_amenities?: Json
          onboarding_status?: string
          phone?: string | null
          primary_target_market?: string | null
          priority_rank?: number | null
          priority_rank_timestamp?: string | null
          target_budget?: number | null
          target_zip_codes?: Json
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          golden_ticket_issued?: boolean
          id?: string
          intent?: string | null
          non_negotiable_amenities?: Json
          onboarding_status?: string
          phone?: string | null
          primary_target_market?: string | null
          priority_rank?: number | null
          priority_rank_timestamp?: string | null
          target_budget?: number | null
          target_zip_codes?: Json
          updated_at?: string
        }
        Relationships: []
      }
      buyer_enrollment_payments: {
        Row: {
          amount_cents: number
          auth_user_id: string
          buyer_account_id: string
          created_at: string
          currency: string
          environment: string
          id: string
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          auth_user_id: string
          buyer_account_id: string
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          auth_user_id?: string
          buyer_account_id?: string
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_enrollment_payments_buyer_account_id_fkey"
            columns: ["buyer_account_id"]
            isOneToOne: false
            referencedRelation: "buyer_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollment_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          environment: string
          id: string
          property_id: string | null
          retained_shares: number
          seller_id: string
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          property_id?: string | null
          retained_shares: number
          seller_id: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          property_id?: string | null
          retained_shares?: number
          seller_id?: string
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollment_payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          seller_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          seller_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          seller_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: Json
          bathrooms: number | null
          bedrooms: number | null
          city: string
          co_owners: Json
          created_at: string
          description: string | null
          encumbrances: Json
          exit_type: string | null
          has_co_owners: boolean
          id: string
          listing_price: number | null
          listing_status: Database["public"]["Enums"]["listing_status"]
          property_type: string | null
          retained_shares: number | null
          seller_id: string
          square_footage: number | null
          state: string
          status: string
          supporting_documents: Json
          updated_at: string
          usage_tag: string | null
          zip: string
        }
        Insert: {
          address: string
          amenities?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          co_owners?: Json
          created_at?: string
          description?: string | null
          encumbrances?: Json
          exit_type?: string | null
          has_co_owners?: boolean
          id?: string
          listing_price?: number | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          property_type?: string | null
          retained_shares?: number | null
          seller_id: string
          square_footage?: number | null
          state: string
          status?: string
          supporting_documents?: Json
          updated_at?: string
          usage_tag?: string | null
          zip: string
        }
        Update: {
          address?: string
          amenities?: Json
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          co_owners?: Json
          created_at?: string
          description?: string | null
          encumbrances?: Json
          exit_type?: string | null
          has_co_owners?: boolean
          id?: string
          listing_price?: number | null
          listing_status?: Database["public"]["Enums"]["listing_status"]
          property_type?: string | null
          retained_shares?: number | null
          seller_id?: string
          square_footage?: number | null
          state?: string
          status?: string
          supporting_documents?: Json
          updated_at?: string
          usage_tag?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      property_media: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          media_type: string
          narrative: string | null
          property_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          narrative?: string | null
          property_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          narrative?: string | null
          property_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_media_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          exit_type: string | null
          full_name: string
          id: string
          id_document_url: string | null
          onboarding_status: string
          phone: string | null
          retained_shares: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          exit_type?: string | null
          full_name?: string
          id: string
          id_document_url?: string | null
          onboarding_status?: string
          phone?: string | null
          retained_shares?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          exit_type?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          onboarding_status?: string
          phone?: string | null
          retained_shares?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      signed_documents: {
        Row: {
          buyer_account_id: string | null
          created_at: string
          document_hash: string | null
          document_type: string
          document_version: string
          id: string
          ip_address: string | null
          property_id: string | null
          seller_id: string | null
          signed_name: string
        }
        Insert: {
          buyer_account_id?: string | null
          created_at?: string
          document_hash?: string | null
          document_type: string
          document_version: string
          id?: string
          ip_address?: string | null
          property_id?: string | null
          seller_id?: string | null
          signed_name: string
        }
        Update: {
          buyer_account_id?: string | null
          created_at?: string
          document_hash?: string | null
          document_type?: string
          document_version?: string
          id?: string
          ip_address?: string | null
          property_id?: string | null
          seller_id?: string | null
          signed_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "signed_documents_buyer_account_id_fkey"
            columns: ["buyer_account_id"]
            isOneToOne: false
            referencedRelation: "buyer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signed_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      listing_status: "forming" | "system_lock" | "closing_ready" | "active"
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
      listing_status: ["forming", "system_lock", "closing_ready", "active"],
    },
  },
} as const
