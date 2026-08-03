export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ReminderStatus = "pending" | "sent" | "cancelled" | "failed";
// L'enum SQL `app_role` est étendu dynamiquement via create_custom_role().
// Côté TypeScript on garde un alias `string` pour pouvoir représenter
// n'importe quel slug (dev, superviseur, caissiere, ou tout rôle custom).
// Les helpers `isDev`, `isCashier` etc. comparent toujours à des
// littéraux donc le confort de l'autocomplétion reste sur les rôles
// connus côté code.
export type AppRole = string;
export type FeedItemKind = "notification" | "reminder";
export type FeedItemStatus = "pending" | "sent" | "failed" | "cancelled";
export type FeedPriority = "low" | "normal" | "high";
export type FeedTargetMode = "all" | "teams" | "users";
export type MessageChannel = "email" | "sms" | "whatsapp" | "push";
export type DeliveryStatus = "queued" | "sent" | "failed" | "skipped";

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email: string;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employees"]["Insert"]>;
        Relationships: [];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          employee_id: string;
          message: string;
          scheduled_at: string;
          status: ReminderStatus;
          attempts: number;
          last_error: string | null;
          last_attempt_at: string | null;
          claimed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          employee_id: string;
          message: string;
          scheduled_at: string;
          status?: ReminderStatus;
          attempts?: number;
          last_error?: string | null;
          last_attempt_at?: string | null;
          claimed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminders"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reminders_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          role: AppRole;
          display_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          phone_last4: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: AppRole;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          phone_last4?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          owner_id: string | null;
          slug: string;
          name: string;
          color: string;
          icon: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          slug: string;
          name: string;
          color?: string;
          icon?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          owner_id: string | null;
          category_id: string | null;
          slug: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          category_id?: string | null;
          slug: string;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_items: {
        Row: {
          id: string;
          kind: FeedItemKind;
          status: FeedItemStatus;
          title: string;
          body: string | null;
          category_id: string | null;
          session_id: string | null;
          priority: FeedPriority;
          due_date: string | null;
          published_at: string;
          expires_at: string | null;
          target_mode: FeedTargetMode;
          target_roles: string[] | null;
          is_draft: boolean;
          is_pinned: boolean;
          image_url: string | null;
          send_channels: string[];
          action_label: string | null;
          action_url: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: FeedItemKind;
          status?: FeedItemStatus;
          title: string;
          body?: string | null;
          category_id?: string | null;
          session_id?: string | null;
          priority?: FeedPriority;
          due_date?: string | null;
          published_at?: string;
          expires_at?: string | null;
          target_mode?: FeedTargetMode;
          target_roles?: string[] | null;
          is_draft?: boolean;
          is_pinned?: boolean;
          image_url?: string | null;
          send_channels?: string[];
          action_label?: string | null;
          action_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feed_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feed_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      feed_item_reads: {
        Row: { feed_item_id: string; user_id: string; read_at: string };
        Insert: { feed_item_id: string; user_id: string; read_at?: string };
        Update: Partial<Database["public"]["Tables"]["feed_item_reads"]["Insert"]>;
        Relationships: [];
      };
      feed_item_reactions: {
        Row: {
          feed_item_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          feed_item_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_item_reactions"]["Insert"]>;
        Relationships: [];
      };
      notification_templates: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          kind: FeedItemKind;
          title: string;
          body: string | null;
          priority: FeedPriority;
          category_id: string | null;
          action_label: string | null;
          action_url: string | null;
          send_channels: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          kind?: FeedItemKind;
          title: string;
          body?: string | null;
          priority?: FeedPriority;
          category_id?: string | null;
          action_label?: string | null;
          action_url?: string | null;
          send_channels?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_templates"]["Insert"]>;
        Relationships: [];
      };
      category_mutes: {
        Row: { user_id: string; category_id: string; created_at: string };
        Insert: { user_id: string; category_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["category_mutes"]["Insert"]>;
        Relationships: [];
      };
      feed_item_comments: {
        Row: {
          id: string;
          feed_item_id: string;
          user_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feed_item_id: string;
          user_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_item_comments"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          slug: string;
          name: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          added_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["team_members"]["Insert"]>;
        Relationships: [];
      };
      feed_item_target_teams: {
        Row: { feed_item_id: string; team_id: string };
        Insert: { feed_item_id: string; team_id: string };
        Update: Partial<Database["public"]["Tables"]["feed_item_target_teams"]["Insert"]>;
        Relationships: [];
      };
      feed_item_target_users: {
        Row: { feed_item_id: string; user_id: string };
        Insert: { feed_item_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["feed_item_target_users"]["Insert"]>;
        Relationships: [];
      };
      notification_schedules: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          body: string | null;
          kind: FeedItemKind;
          category_id: string | null;
          session_id: string | null;
          priority: FeedPriority;
          timezone: string;
          times: string[];
          days_of_week: number[];
          target_mode: FeedTargetMode;
          is_active: boolean;
          last_run_at: string | null;
          next_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          body?: string | null;
          kind?: FeedItemKind;
          category_id?: string | null;
          session_id?: string | null;
          priority?: FeedPriority;
          timezone?: string;
          times: string[];
          days_of_week: number[];
          target_mode?: FeedTargetMode;
          is_active?: boolean;
          last_run_at?: string | null;
          next_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_schedules"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "notification_schedules_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_schedules_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_target_teams: {
        Row: { schedule_id: string; team_id: string };
        Insert: { schedule_id: string; team_id: string };
        Update: Partial<Database["public"]["Tables"]["schedule_target_teams"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_target_teams_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "notification_schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_target_users: {
        Row: { schedule_id: string; user_id: string };
        Insert: { schedule_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["schedule_target_users"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "schedule_target_users_schedule_id_fkey";
            columns: ["schedule_id"];
            isOneToOne: false;
            referencedRelation: "notification_schedules";
            referencedColumns: ["id"];
          },
        ];
      };
      cashier_checklists: {
        Row: {
          id: string;
          user_id: string;
          completed_items: string[];
          total_items: number;
          notes: string | null;
          submitted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_items: string[];
          total_items: number;
          notes?: string | null;
          submitted_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cashier_checklists"]["Insert"]>;
        Relationships: [];
      };
      roles: {
        Row: {
          slug: string;
          name: string;
          description: string | null;
          color: string;
          icon: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["roles"]["Insert"]>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_slug: string;
          permission: string;
        };
        Insert: {
          role_slug: string;
          permission: string;
        };
        Update: Partial<Database["public"]["Tables"]["role_permissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_slug_fkey";
            columns: ["role_slug"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["slug"];
          },
        ];
      };
      role_banners: {
        Row: {
          role_slug: string;
          enabled: boolean;
          message: string;
          cta_label: string | null;
          cta_url: string;
          icon: string;
          color: string;
          dismiss_condition: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          role_slug: string;
          enabled?: boolean;
          message: string;
          cta_label?: string | null;
          cta_url?: string;
          icon?: string;
          color?: string;
          dismiss_condition?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["role_banners"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "role_banners_role_slug_fkey";
            columns: ["role_slug"];
            isOneToOne: true;
            referencedRelation: "roles";
            referencedColumns: ["slug"];
          },
        ];
      };
      checklist_tasks: {
        Row: {
          id: string;
          task_key: string;
          section: "opening" | "during" | "closing" | "free_time" | "meeting";
          label: string;
          sort_order: number;
          is_active: boolean;
          target_role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_key: string;
          section: "opening" | "during" | "closing" | "free_time" | "meeting";
          label: string;
          sort_order?: number;
          is_active?: boolean;
          target_role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["checklist_tasks"]["Insert"]>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["push_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      schedule_runs: {
        Row: {
          schedule_id: string;
          run_at: string;
          feed_item_id: string | null;
          created_at: string;
        };
        Insert: {
          schedule_id: string;
          run_at: string;
          feed_item_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_runs"]["Insert"]>;
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          app_name: string;
          app_tagline: string | null;
          logo_url: string | null;
          cashier_banner_enabled: boolean;
          cashier_banner_message: string | null;
          cashier_banner_cta: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: number;
          app_name?: string;
          app_tagline?: string | null;
          logo_url?: string | null;
          cashier_banner_enabled?: boolean;
          cashier_banner_message?: string | null;
          cashier_banner_cta?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Insert"]>;
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          id: string;
          channel: MessageChannel;
          recipient: string;
          subject: string | null;
          body: string;
          status: DeliveryStatus;
          provider: string | null;
          provider_message_id: string | null;
          error: string | null;
          metadata: Json;
          user_id: string | null;
          source: string | null;
          source_id: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          channel: MessageChannel;
          recipient: string;
          subject?: string | null;
          body: string;
          status: DeliveryStatus;
          provider?: string | null;
          provider_message_id?: string | null;
          error?: string | null;
          metadata?: Json;
          user_id?: string | null;
          source?: string | null;
          source_id?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["notification_deliveries"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_dev: { Args: Record<string, never>; Returns: boolean };
      compute_next_run: {
        Args: {
          p_timezone: string;
          p_times: string[];
          p_days_of_week: number[];
          p_after?: string;
        };
        Returns: string | null;
      };
      claim_due_reminders: {
        Args: {
          batch_size?: number;
          max_attempts?: number;
          stale_after_minutes?: number;
        };
        Returns: Database["public"]["Tables"]["reminders"]["Row"][];
      };
      create_custom_role: {
        Args: {
          p_slug: string;
          p_name: string;
          p_description: string | null;
          p_color: string | null;
          p_icon: string | null;
        };
        Returns: void;
      };
      delete_custom_role: {
        Args: { p_slug: string };
        Returns: void;
      };
    };
    Enums: {
      reminder_status: ReminderStatus;
      app_role: AppRole;
      feed_item_kind: FeedItemKind;
      feed_item_status: FeedItemStatus;
      feed_priority: FeedPriority;
      feed_target_mode: FeedTargetMode;
      message_channel: MessageChannel;
      delivery_status: DeliveryStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
