// TypeScript types for all database tables

export type Profile = {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    pineapple_balance: number;
    created_at: string;
    updated_at: string;
};

export type Project = {
    id: string;
    owner_id: string;
    name: string;
    description: string | null;
    url: string | null;
    screenshot_url: string | null;
    status: "active" | "listed" | "sold" | "archived";
    progress_score: number;
    valuation_low: number;
    valuation_high: number;
    why_built: string | null;
    created_at: string;
    updated_at: string;
};

export type MessageRole = "user" | "assistant";
export type MessageTag = "feature" | "customer" | "revenue" | "ask" | "general" | null;

export type Message = {
    id: string;
    project_id: string;
    user_id: string;
    role: MessageRole;
    content: string;
    extracted_intent: string | null;
    tag: MessageTag;
    pineapples_earned: number;
    created_at: string;
};

export type ActivityEventType =
    | "prompt"
    | "update"
    | "link_linkedin"
    | "link_github"
    | "link_website"
    | "feature_shipped"
    | "customer_added"
    | "revenue_logged"
    | "listing_created"
    | "offer_received"
    | "reward_earned"
    | "reward_redeemed"
    | "project_created";

export type ActivityEvent = {
    id: string;
    project_id: string;
    user_id: string;
    event_type: ActivityEventType;
    description: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
};

export type RewardLedgerEntry = {
    id: string;
    user_id: string;
    project_id: string | null;
    event_type: string;
    reward_amount: number;
    balance_after: number;
    idempotency_key: string;
    created_at: string;
};

export type RedemptionStatus = "pending" | "fulfilled" | "failed";

export type Redemption = {
    id: string;
    user_id: string;
    amount: number;
    reward_type: string;
    status: RedemptionStatus;
    metadata: Record<string, unknown>;
    created_at: string;
    fulfilled_at: string | null;
};

export type Listing = {
    id: string;
    project_id: string;
    user_id: string;
    title: string;
    description: string | null;
    asking_price_low: number | null;
    asking_price_high: number | null;
    timeline_snapshot: unknown;
    screenshots: string[];
    metrics: Record<string, unknown>;
    status: "active" | "sold" | "withdrawn";
    created_at: string;
    updated_at: string;
};

export type Offer = {
    id: string;
    project_id: string;
    user_id: string;
    offer_low: number;
    offer_high: number;
    reasoning: string | null;
    signals: Record<string, unknown>;
    status: "active" | "expired" | "accepted";
    created_at: string;
    expires_at: string | null;
};

export type AnalyticsEvent = {
    id: string;
    user_id: string | null;
    project_id: string | null;
    event_name: string;
    properties: Record<string, unknown>;
    created_at: string;
};

// Reward schedule constants
export const REWARD_SCHEDULE: Record<string, number> = {
    prompt: 1,
    tag_bonus: 1,
    link_linkedin: 5,
    link_github: 5,
    link_website: 3,
    feature_shipped: 3,
    customer_added: 5,
    revenue_logged: 10,
};

export const RATE_LIMIT_MAX_PROMPTS_PER_HOUR = 60;
export const MIN_REDEMPTION_AMOUNT = 50;
