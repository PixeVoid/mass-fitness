/**
 * Hand-maintained mirror of supabase/migrations/*.sql.
 *
 * Regenerate instead of hand-editing once the CLI is wired up:
 *   npx supabase gen types typescript --project-id <id> > src/lib/db-types.ts
 * Until then, any schema migration must be reflected here in the same commit.
 */

export type PlanTier = "group" | "one_to_one";
export type PlanDuration = "monthly" | "quarterly" | "annual";
export type SubscriptionStatus = "pending" | "active" | "expired" | "cancelled";
export type UserRole = "member" | "trainer" | "admin";
export type ClassStatus = "scheduled" | "live" | "ended" | "cancelled";

// Type aliases rather than interfaces throughout: the Supabase client
// constrains each table's Row to `Record<string, unknown>`, and TypeScript
// only gives implicit index signatures to type aliases. Declaring these as
// interfaces makes the schema silently fail that constraint, which shows up
// as every Insert/Update argument typing as `never`.
export type Profile = {
  id: string;
  name: string | null;
  // Optional contact field only — see 0002_email_auth.sql. Not unique, not
  // the auth key.
  phone: string | null;
  // The account key since 0002_email_auth.sql. Unique (partial index, null
  // excluded) at the DB level.
  email: string | null;
  fitness_goal: string | null;
  role: UserRole;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Subscription = {
  id: string;
  user_id: string;
  plan_tier: PlanTier;
  plan_duration: PlanDuration;
  amount_paise: number;
  status: SubscriptionStatus;
  phonepe_txn_id: string | null;
  phonepe_merchant_txn_id: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export type ClassReminder = {
  class_id: string;
  user_id: string;
  kind: string;
  sent_at: string;
}

export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  position: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type FitnessClass = {
  id: string;
  title: string;
  trainer_name: string | null;
  trainer_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  livekit_room: string;
  is_premium: boolean;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

export type ChatLog = {
  id: string;
  user_id: string;
  message: string;
  response: string | null;
  created_at: string;
}

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  summary: string | null;
  source: string;
  // Populated by the scored self-assessment (/assessment) — null for leads
  // captured any other way, e.g. the old chat-based flow.
  score: number | null;
  band: string | null;
  tier_nudge: PlanTier | null;
  answers: Record<string, unknown> | null;
  created_at: string;
}

export type PlanPrice = {
  tier: PlanTier;
  monthly_paise: number;
  updated_at: string;
}

export type PlanDurationDiscount = {
  duration: PlanDuration;
  discount: number;
  price_confirmed: boolean;
  updated_at: string;
}

type Insertable<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Insertable<Profile, Exclude<keyof Profile, "id">>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Insertable<
          Subscription,
          "id" | "status" | "phonepe_txn_id" | "phonepe_merchant_txn_id" |
          "start_date" | "end_date" | "created_at" | "updated_at"
        >;
        Update: Partial<Subscription>;
        Relationships: [];
      };
      classes: {
        Row: FitnessClass;
        Insert: Insertable<
          FitnessClass,
          "id" | "trainer_name" | "trainer_id" | "duration_minutes" |
          "is_premium" | "status" | "created_at" | "updated_at"
        >;
        Update: Partial<FitnessClass>;
        Relationships: [];
      };
      chat_logs: {
        Row: ChatLog;
        Insert: Insertable<ChatLog, "id" | "response" | "created_at">;
        Update: Partial<ChatLog>;
        Relationships: [];
      };
      leads: {
        Row: Lead;
        Insert: Insertable<
          Lead,
          | "id" | "email" | "summary" | "source" | "created_at"
          | "score" | "band" | "tier_nudge" | "answers"
        >;
        Update: Partial<Lead>;
        Relationships: [];
      };
      plan_prices: {
        Row: PlanPrice;
        Insert: Insertable<PlanPrice, "updated_at">;
        Update: Partial<PlanPrice>;
        Relationships: [];
      };
      class_reminders: {
        Row: ClassReminder;
        Insert: Insertable<ClassReminder, "kind" | "sent_at">;
        Update: Partial<ClassReminder>;
        Relationships: [];
      };
      posts: {
        Row: Post;
        Insert: Insertable<
          Post,
          | "id" | "excerpt" | "body" | "seo_title" | "seo_description"
          | "published_at" | "author_id" | "created_at" | "updated_at"
        >;
        Update: Partial<Post>;
        Relationships: [];
      };
      faqs: {
        Row: Faq;
        Insert: Insertable<
          Faq,
          | "id" | "category" | "position" | "published"
          | "created_at" | "updated_at"
        >;
        Update: Partial<Faq>;
        Relationships: [];
      };
      plan_duration_discounts: {
        Row: PlanDurationDiscount;
        Insert: Insertable<PlanDurationDiscount, "price_confirmed" | "updated_at">;
        Update: Partial<PlanDurationDiscount>;
        Relationships: [];
      };
    };
    // Empty-mapped-type spelling matches what `supabase gen types` emits.
    // `Record<never, never>` looks equivalent but does not satisfy the
    // client's GenericSchema constraint, which silently collapses every
    // table's Insert/Update type to `never`.
    Views: { [_ in never]: never };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
