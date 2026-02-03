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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ecg_sessions: {
        Row: {
          classification: string | null
          confidence_score: number | null
          created_at: string
          end_time: string | null
          heart_rate_avg: number | null
          heart_rate_max: number | null
          heart_rate_min: number | null
          hrv_rmssd: number | null
          hrv_sdnn: number | null
          id: string
          notes: string | null
          qrs_duration_avg: number | null
          qt_interval_avg: number | null
          risk_level: string | null
          rr_interval_avg: number | null
          session_name: string | null
          start_time: string
          suggestions: string[] | null
          user_id: string
        }
        Insert: {
          classification?: string | null
          confidence_score?: number | null
          created_at?: string
          end_time?: string | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          hrv_rmssd?: number | null
          hrv_sdnn?: number | null
          id?: string
          notes?: string | null
          qrs_duration_avg?: number | null
          qt_interval_avg?: number | null
          risk_level?: string | null
          rr_interval_avg?: number | null
          session_name?: string | null
          start_time?: string
          suggestions?: string[] | null
          user_id: string
        }
        Update: {
          classification?: string | null
          confidence_score?: number | null
          created_at?: string
          end_time?: string | null
          heart_rate_avg?: number | null
          heart_rate_max?: number | null
          heart_rate_min?: number | null
          hrv_rmssd?: number | null
          hrv_sdnn?: number | null
          id?: string
          notes?: string | null
          qrs_duration_avg?: number | null
          qt_interval_avg?: number | null
          risk_level?: string | null
          rr_interval_avg?: number | null
          session_name?: string | null
          start_time?: string
          suggestions?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allergies: string[] | null
          blood_pressure_diastolic: number | null
          blood_pressure_systolic: number | null
          bmi: number | null
          cholesterol_hdl: number | null
          cholesterol_ldl: number | null
          cholesterol_total: number | null
          created_at: string
          diabetes_status: string | null
          exercise_frequency: string | null
          family_heart_disease: boolean | null
          fasting_blood_sugar: number | null
          full_name: string | null
          health_conditions: string[] | null
          height: number | null
          id: string
          medications: string[] | null
          smoking_status: string | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          allergies?: string[] | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          cholesterol_hdl?: number | null
          cholesterol_ldl?: number | null
          cholesterol_total?: number | null
          created_at?: string
          diabetes_status?: string | null
          exercise_frequency?: string | null
          family_heart_disease?: boolean | null
          fasting_blood_sugar?: number | null
          full_name?: string | null
          health_conditions?: string[] | null
          height?: number | null
          id?: string
          medications?: string[] | null
          smoking_status?: string | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          allergies?: string[] | null
          blood_pressure_diastolic?: number | null
          blood_pressure_systolic?: number | null
          bmi?: number | null
          cholesterol_hdl?: number | null
          cholesterol_ldl?: number | null
          cholesterol_total?: number | null
          created_at?: string
          diabetes_status?: string | null
          exercise_frequency?: string | null
          family_heart_disease?: boolean | null
          fasting_blood_sugar?: number | null
          full_name?: string | null
          health_conditions?: string[] | null
          height?: number | null
          id?: string
          medications?: string[] | null
          smoking_status?: string | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      risk_logs: {
        Row: {
          abnormal_qrs_deviation: boolean | null
          created_at: string
          id: string
          model_confidence: number | null
          rhythmic_abnormality_duration: number | null
          risk_level: string
          rr_variability: number | null
          rule_triggered: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          abnormal_qrs_deviation?: boolean | null
          created_at?: string
          id?: string
          model_confidence?: number | null
          rhythmic_abnormality_duration?: number | null
          risk_level: string
          rr_variability?: number | null
          rule_triggered?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          abnormal_qrs_deviation?: boolean | null
          created_at?: string
          id?: string
          model_confidence?: number | null
          rhythmic_abnormality_duration?: number | null
          risk_level?: string
          rr_variability?: number | null
          rule_triggered?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ecg_sessions"
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
  public: {
    Enums: {},
  },
} as const
