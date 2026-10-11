export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      colleges: {
        Row: { id: string; name: string; domain: string; created_at: string }
        Insert: { id?: string; name: string; domain: string; created_at?: string }
        Update: { id?: string; name?: string; domain?: string; created_at?: string }
        Relationships: []
      }
      departments: {
        Row: { id: string; college_id: string; name: string; created_at: string }
        Insert: { id?: string; college_id: string; name: string; created_at?: string }
        Update: { id?: string; college_id?: string; name?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "departments_college_id_fkey"; columns: ["college_id"]; isOneToOne: false; referencedRelation: "colleges"; referencedColumns: ["id"] }
        ]
      }
      sections: {
        Row: { id: string; department_id: string; name: string; academic_year: string; batch: string; invite_code: string; created_at: string }
        Insert: { id?: string; department_id: string; name: string; academic_year: string; batch: string; invite_code?: string; created_at?: string }
        Update: { id?: string; department_id?: string; name?: string; academic_year?: string; batch?: string; invite_code?: string; created_at?: string }
        Relationships: [
          { foreignKeyName: "sections_department_id_fkey"; columns: ["department_id"]; isOneToOne: false; referencedRelation: "departments"; referencedColumns: ["id"] }
        ]
      }
      profiles: {
        Row: { id: string; email: string; full_name: string | null; role: Database["public"]["Enums"]["user_role"]; section_id: string | null; fcm_token: string | null; created_at: string }
        Insert: { id: string; email: string; full_name?: string | null; role?: Database["public"]["Enums"]["user_role"]; section_id?: string | null; fcm_token?: string | null; created_at?: string }
        Update: { id?: string; email?: string; full_name?: string | null; role?: Database["public"]["Enums"]["user_role"]; section_id?: string | null; fcm_token?: string | null; created_at?: string }
        Relationships: [
          { foreignKeyName: "profiles_section_id_fkey"; columns: ["section_id"]; isOneToOne: false; referencedRelation: "sections"; referencedColumns: ["id"] }
        ]
      }
      student_profiles: {
        Row: { user_id: string; branch: string | null; year: number | null; cgpa_band: string | null; career_tracks: string[] | null; active_hours_json: Json; updated_at: string }
        Insert: { user_id: string; branch?: string | null; year?: number | null; cgpa_band?: string | null; career_tracks?: string[] | null; active_hours_json?: Json; updated_at?: string }
        Update: { user_id?: string; branch?: string | null; year?: number | null; cgpa_band?: string | null; career_tracks?: string[] | null; active_hours_json?: Json; updated_at?: string }
        Relationships: [
          { foreignKeyName: "student_profiles_user_id_fkey"; columns: ["user_id"]; isOneToOne: true; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      posts: {
        Row: {
          id: string; section_id: string | null; title: string; summary: string; link: string
          category: Database["public"]["Enums"]["post_category"]
          deadline: string | null; audience_filter: Json; link_status: string
          link_checked_at: string | null; is_archived: boolean; published_at: string | null
          created_by: string; created_at: string; updated_at: string
        }
        Insert: {
          id?: string; section_id?: string | null; title: string; summary: string; link: string
          category: Database["public"]["Enums"]["post_category"]
          deadline?: string | null; audience_filter?: Json; link_status?: string
          link_checked_at?: string | null; is_archived?: boolean; published_at?: string | null
          created_by: string; created_at?: string; updated_at?: string
        }
        Update: {
          id?: string; section_id?: string | null; title?: string; summary?: string; link?: string
          category?: Database["public"]["Enums"]["post_category"]
          deadline?: string | null; audience_filter?: Json; link_status?: string
          link_checked_at?: string | null; is_archived?: boolean; published_at?: string | null
          created_by?: string; created_at?: string; updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "posts_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "posts_section_id_fkey"; columns: ["section_id"]; isOneToOne: false; referencedRelation: "sections"; referencedColumns: ["id"] }
        ]
      }
      post_views: {
        Row: { id: string; user_id: string; post_id: string; viewed_at: string; clicked_at: string | null }
        Insert: { id?: string; user_id: string; post_id: string; viewed_at?: string; clicked_at?: string | null }
        Update: { id?: string; user_id?: string; post_id?: string; viewed_at?: string; clicked_at?: string | null }
        Relationships: [
          { foreignKeyName: "post_views_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] },
          { foreignKeyName: "post_views_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      post_actions: {
        Row: { id: string; user_id: string; post_id: string; status: Database["public"]["Enums"]["post_action_status"]; is_shared_with_fa: boolean; updated_at: string }
        Insert: { id?: string; user_id: string; post_id: string; status: Database["public"]["Enums"]["post_action_status"]; is_shared_with_fa?: boolean; updated_at?: string }
        Update: { id?: string; user_id?: string; post_id?: string; status?: Database["public"]["Enums"]["post_action_status"]; is_shared_with_fa?: boolean; updated_at?: string }
        Relationships: [
          { foreignKeyName: "post_actions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "post_actions_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] }
        ]
      }
      sessions: {
        Row: { id: string; user_id: string; started_at: string }
        Insert: { id?: string; user_id: string; started_at?: string }
        Update: { id?: string; user_id?: string; started_at?: string }
        Relationships: [
          { foreignKeyName: "sessions_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      notifications: {
        Row: { id: string; user_id: string; post_id: string | null; type: Database["public"]["Enums"]["notification_type"]; scheduled_for: string; sent_at: string | null; created_at: string }
        Insert: { id?: string; user_id: string; post_id?: string | null; type: Database["public"]["Enums"]["notification_type"]; scheduled_for: string; sent_at?: string | null; created_at?: string }
        Update: { id?: string; user_id?: string; post_id?: string | null; type?: Database["public"]["Enums"]["notification_type"]; scheduled_for?: string; sent_at?: string | null; created_at?: string }
        Relationships: [
          { foreignKeyName: "notifications_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "notifications_post_id_fkey"; columns: ["post_id"]; isOneToOne: false; referencedRelation: "posts"; referencedColumns: ["id"] }
        ]
      }
      user_preferences: {
        Row: { id: string; user_id: string; category: Database["public"]["Enums"]["post_category"] }
        Insert: { id?: string; user_id: string; category: Database["public"]["Enums"]["post_category"] }
        Update: { id?: string; user_id?: string; category?: Database["public"]["Enums"]["post_category"] }
        Relationships: [
          { foreignKeyName: "user_preferences_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      urgency_score: {
        Args: { deadline: string }
        Returns: number
      }
    }
    Enums: {
      post_category: "Workshop" | "Placement Info" | "Test Link" | "Tech News" | "Industry Update"
      user_role: "admin" | "student" | "fa" | "co_fa" | "cr"
      post_action_status: "saved" | "interested" | "applied" | "shortlisted" | "selected"
      notification_type: "deadline_reminder" | "new_post" | "daily_digest" | "link_dead"
    }
    CompositeTypes: { [_ in never]: never }
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      post_category: ["Workshop", "Placement Info", "Test Link", "Tech News", "Industry Update"],
      user_role: ["admin", "student", "fa", "co_fa", "cr"],
      post_action_status: ["saved", "interested", "applied", "shortlisted", "selected"],
      notification_type: ["deadline_reminder", "new_post", "daily_digest", "link_dead"],
    },
  },
} as const
