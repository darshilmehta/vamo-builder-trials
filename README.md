<br/><p align="center">
  <img src="public/vamo_logo.png" alt="Vamo Logo" width="120" />
</p>

<h1 align="center">🍍 Vamo — Build, Track & Earn for Your Startup</h1>

<p align="center">
  <strong>A Lovable-style builder where non-technical founders iterate on their startup UI and business progress in parallel.</strong>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-database-schema">Database Schema</a> •
  <a href="#-deployment">Deployment</a> •
  <a href="#-security">Security</a>
</p>

---

## 📖 Overview

Vamo is a startup builder platform that combines **UI preview**, **AI-powered business intelligence**, and a **gamified progress tracking system** into a unified workspace. Instead of toggling between UI and code, founders toggle between:

- **UI Preview** — what they've built (iframe or screenshot)
- **Business Panel** — valuation, traction signals, progress, and activity timeline

The platform rewards **real project progress** with 🍍 **pineapples** (an in-app currency redeemable for Uber Eats credits), and optionally lets founders **list their project for sale** or **receive instant AI-generated offers**.

> **North Star Metric:** Verified progress events per active project per week.

---

## 🚀 Quick Start

### Prerequisites

| Tool       | Version   |
|------------|-----------|
| Node.js    | ≥ 18.x    |
| npm        | ≥ 9.x     |
| Git        | Latest    |
| Supabase   | Hosted project ([supabase.com](https://supabase.com)) |
| OpenAI     | API key ([platform.openai.com](https://platform.openai.com)) |

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/vamo-builder-trials.git
cd vamo-builder-trials
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

Fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-your-openai-key
```

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase Dashboard → Settings → API |
| `OPENAI_API_KEY` | OpenAI API key for AI features | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

> ⚠️ **Important:** Never commit `.env.local`. It is already in `.gitignore`. No service role key is used anywhere in the codebase — all data access goes through the anon key + user JWT + RLS policies.

### 3. Set Up Supabase Database

Run the SQL migration files in your Supabase project's SQL Editor, in order:

1. **`supabase/migrations/001_schema.sql`** — Creates all 9 tables, RLS policies, the `is_admin()` helper function, and the auto-profile trigger
2. **`supabase/migrations/002_enable_realtime.sql`** — Enables Realtime subscriptions for live data updates

**Steps:**
1. Go to your Supabase Dashboard → **SQL Editor**
2. Paste the contents of `001_schema.sql` and click **Run**
3. Paste the contents of `002_enable_realtime.sql` and click **Run**
4. Verify tables were created under **Table Editor**

### 4. Enable Email Auth (Required)

1. In Supabase Dashboard → **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. (Optional) Enable **Google OAuth** for social login

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the landing page.

### 6. Set Yourself as Admin

1. Sign up for an account through the app
2. Go to Supabase Dashboard → **Table Editor** → `profiles`
3. Find your user row and set `is_admin` to `true`
4. Navigate to `/admin` to access the admin dashboard

---

## ✨ Features

### Required Features (Per Spec)

| Feature | Status | Route/Component |
|---------|--------|-----------------|
| **Email/Password Auth** | ✅ | `/login`, `/signup` |
| **Auto Profile Creation** | ✅ | DB trigger on `auth.users` |
| **Route Protection Middleware** | ✅ | `src/middleware.ts` |
| **Admin Route Gating** | ✅ | Middleware checks `is_admin` |
| **Project Creation** | ✅ | `/projects/new` |
| **3-Panel Builder Workspace** | ✅ | `/builder/[projectId]` |
| **AI Chat (Streaming)** | ✅ | `ChatPanel.tsx`, `/api/chat` |
| **Intent Extraction** | ✅ | AI extracts: feature, customer, revenue, ask, general |
| **Message Tagging** | ✅ | User-selectable tags with badge display |
| **UI Preview (iframe + fallback)** | ✅ | `UIPreview.tsx` with device toggle |
| **Business Panel** | ✅ | `BusinessPanel.tsx` |
| **Valuation Range Display** | ✅ | Currency-formatted with AI adjustments |
| **"Why I Built This" Editor** | ✅ | Inline editable with character counter |
| **Progress Score** | ✅ | Color-coded progress bar (0–100) |
| **Traction Signals** | ✅ | Auto-extracted from chat activity |
| **Linked Assets** | ✅ | LinkedIn, GitHub, Website with link/unlink |
| **Activity Timeline** | ✅ | Mini (last 10) + full-page view |
| **Pineapple Reward Engine** | ✅ | Idempotent, ledger-based, rate-limited |
| **Pineapple Wallet** | ✅ | `/wallet` with balance, history, redemption |
| **Redemption Flow** | ✅ | Uber Eats credits, min 50 🍍 |
| **Marketplace Listings** | ✅ | `/marketplace` with listing detail pages |
| **Instant Offer Engine** | ✅ | `/api/offer` with AI valuation |
| **Admin Dashboard** | ✅ | `/admin` with stats, users, redemptions |
| **Analytics Event Tracking** | ✅ | `trackEvent()` in `lib/analytics.ts` |
| **Row Level Security (RLS)** | ✅ | All 9 tables have RLS policies |
| **Responsive Design** | ✅ | Desktop, tablet, mobile layouts |
| **Loading States** | ✅ | Skeleton components throughout |
| **Toast Notifications** | ✅ | Sonner toasts for all async actions |

### 🎁 Out-of-Scope Bonus Features (18 extras — not in original requirements)

> **📄 Full details:** [BONUS_FEATURES.md](BONUS_FEATURES.md)

The following features were **not required** by the competition spec but have been implemented to deliver a more polished, production-ready experience:

| # | Feature | What It Does |
|---|---------|-------------|
| 1 | 🌓 Dark Mode | Full dark/light/system theme toggle via `next-themes` |
| 2 | 🌐 Internationalization | 5 languages: English, Spanish, French, Hindi, Chinese |
| 3 | 🔤 Font Size Accessibility | Adjustable base font size for readability |
| 4 | 📊 Growth Trend Charts | Recharts line charts for progress & valuation trends |
| 5 | ⚡ Streaming AI | Token-by-token streaming from GPT-4o-mini |
| 6 | 📡 Supabase Realtime | Live data updates via Realtime subscriptions (no polling) |
| 7 | 🎆 Cursor Sparkle | Interactive particle effects on landing page |
| 8 | 🍍 Pineapple Physics | Physics-based reward animations |
| 9 | 🔄 Navigation Loader | Smooth top loading bar on route transitions |
| 10 | 🛡️ Wallet Integrity Check | Ledger sum verification before redemptions |
| 11 | 📱 Resizable Panels | Drag-to-resize builder panels with collapse/expand |
| 12 | 🏷️ Tabbed Mobile | shadcn Tabs for mobile builder layout |
| 13 | 🖼️ Device Preview Toggle | Desktop/Tablet/Mobile iframe width presets |
| 14 | ✏️ Inline Name Editing | Click-to-edit project name in builder header |
| 15 | 🔗 URL Validation | Per-platform URL validation for linked assets |
| 16 | 🚫 Offer Rate Limiting | 5 offers/hour rate limit (beyond spec's prompt limit) |
| 17 | 📈 Offer Auto-Expiry | Old offers auto-expire when new ones are generated |
| 18 | ⚙️ Production Optimizations | Console stripping, AVIF/WebP, tree-shaking, immutable caching |
| 19 | 🔁 Message Edit/Delete with Rollback | Edit or delete prompts with full side-effect reversal |
| 20 | 🧪 Automated Test Suite | 14 Jest tests covering API routes + UI components |



## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 14.2.21 |
| **UI Components** | shadcn/ui (Radix primitives) | Latest |
| **Styling** | Tailwind CSS | 3.4.16 |
| **Backend / DB** | Supabase (PostgreSQL + Realtime) | @supabase/supabase-js 2.47.0 |
| **Auth** | Supabase Auth (email/password) | @supabase/ssr 0.5.2 |
| **AI** | OpenAI GPT-4o-mini | openai 4.73.0 |
| **Charts** | Recharts | 3.7.0 |
| **Resizable Layout** | react-resizable-panels | 4.6.2 |
| **Toasts** | Sonner | 1.7.0 |
| **Theming** | next-themes | 0.4.4 |
| **Icons** | Lucide React | 0.460.0 |
| **Font** | Inter (Google Fonts) | — |
| **Hosting** | Vercel | — |

### What's NOT Used (Per Requirements)

- ❌ No Firebase, Prisma, or Drizzle
- ❌ No service role key anywhere
- ❌ No Next.js Pages Router — only App Router
- ❌ No Material UI, Chakra, or Ant Design — only shadcn/ui

---

## 📁 Project Structure

```
vamo-builder-trials/
├── public/                          # Static assets
│   └── vamo_logo.png               # Vamo logo
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql           # Full DB schema (9 tables + RLS + triggers)
│       └── 002_enable_realtime.sql  # Realtime publication subscriptions
├── src/
│   ├── middleware.ts                # Auth middleware (route protection + admin gating)
│   ├── actions/
│   │   ├── ai.ts                    # Server-side AI action helpers
│   │   └── auth.ts                  # Server-side auth actions (signup, login, logout)
│   ├── app/
│   │   ├── layout.tsx               # Root layout (ThemeProvider, I18n, FontSize, Toaster)
│   │   ├── page.tsx                 # Landing page with hero, features, CTA
│   │   ├── globals.css              # Tailwind globals + custom CSS
│   │   ├── login/page.tsx           # Login page
│   │   ├── signup/page.tsx          # Signup page
│   │   ├── auth/callback/           # Supabase auth callback handler
│   │   ├── projects/
│   │   │   ├── page.tsx             # Projects dashboard (list user's projects)
│   │   │   └── new/page.tsx         # Create new project form
│   │   ├── builder/
│   │   │   └── [projectId]/page.tsx # 3-panel builder workspace
│   │   ├── wallet/page.tsx          # Pineapple wallet (balance, rewards, redemptions)
│   │   ├── marketplace/
│   │   │   ├── page.tsx             # Public marketplace grid
│   │   │   └── [listingId]/page.tsx # Listing detail page
│   │   ├── profile/page.tsx         # User profile settings
│   │   ├── admin/page.tsx           # Admin dashboard (users, stats, redemptions)
│   │   └── api/
│   │       ├── chat/
│   │       │   ├── route.ts             # POST: AI chat with streaming + rewards
│   │       │   └── [messageId]/route.ts # PUT: Edit message + DELETE: Delete with rollback
│   │       ├── rewards/
│   │       │   ├── route.ts             # POST: Idempotent pineapple reward engine
│   │       │   └── route.test.ts        # Jest tests (idempotency, auth, validation)
│   │       ├── offer/
│   │       │   ├── route.ts             # POST: AI instant offer generation
│   │       │   └── route.test.ts        # Jest tests (auth, rate limit, AI response)
│   │       ├── redeem/
│   │       │   ├── route.ts             # POST: Pineapple redemption with integrity check
│   │       │   └── route.test.ts        # Jest tests (auth, min amount, integrity, success)
│   ├── components/
│   │   ├── Header.tsx               # Global header (3 variants: public, auth, builder)
│   │   ├── NavigationLoader.tsx     # Top loading bar on route transitions
│   │   ├── ThemeProvider.tsx        # Dark mode provider (next-themes)
│   │   ├── I18nProvider.tsx         # Internationalization context (5 languages)
│   │   ├── FontSizeProvider.tsx     # Adjustable font size context
│   │   ├── CursorSparkle.tsx        # Interactive cursor particle effects
│   │   ├── PineapplePhysics.tsx     # Physics-based pineapple animations
│   │   ├── LLMLoadingContext.tsx    # AI loading state context
│   │   ├── builder/
│   │   │   ├── ChatPanel.tsx        # Builder chat with AI, tagging, streaming
│   │   │   ├── BusinessPanel.tsx    # Business panel (valuation, progress, timeline, charts)
│   │   │   └── UIPreview.tsx        # Iframe preview with device toggle + fallback
│   │   ├── marketplace/
│   │   │   └── ...                  # Marketplace card components
│   │   └── ui/                      # 18 shadcn/ui components
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── resizable.tsx
│   │       ├── scroll-area.tsx
│   │       ├── separator.tsx
│   │       ├── skeleton.tsx
│   │       ├── sonner.tsx
│   │       ├── table.tsx
│   │       ├── tabs.tsx
│   │       ├── textarea.tsx
│   │       ├── tooltip.tsx
│   │       └── button.test.tsx          # Jest tests (render, disabled, asChild)
│   ├── lib/
│   │   ├── analytics.ts             # Fire-and-forget analytics tracking
│   │   ├── env.ts                   # Environment variable helpers
│   │   ├── openai.ts                # Singleton OpenAI client
│   │   ├── types.ts                 # TypeScript types + reward constants
│   │   ├── utils.ts                 # Tailwind cn() utility
│   │   ├── useRealtimeTable.ts      # Supabase Realtime subscription hook
│   │   └── supabase/
│   │       ├── browser.ts           # Browser-side Supabase client
│   │       └── server.ts            # Server-side Supabase client (SSR)
│   └── locales/                     # i18n translation files
│       ├── en.json                  # English
│       ├── es.json                  # Spanish
│       ├── fr.json                  # French
│       ├── hi.json                  # Hindi
│       └── zh.json                  # Chinese
├── .env.local.example               # Template for environment variables
├── .env.example                     # Alternate env template
├── .gitignore                       # Git ignore rules
├── components.json                  # shadcn/ui configuration
├── jest.config.ts                   # Jest configuration (v8 coverage, jsdom)
├── jest.setup.ts                    # Test setup (@testing-library/jest-dom, NextResponse mock)
├── next.config.mjs                  # Next.js config (optimizations, caching)
├── tailwind.config.ts               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

---

## 🔌 API Reference

### `POST /api/chat`

AI-powered project chat with streaming responses and automatic reward distribution.

**Request Body:**
```json
{
  "projectId": "uuid",
  "message": "shipped the landing page",
  "tag": "feature"  // optional: "feature" | "customer" | "revenue" | "ask"
}
```

**Response:** Server-Sent text stream with token-by-token AI response, followed by a `__METADATA__` delimiter with:
```json
{
  "message": { "id": "...", "content": "...", "pineapples_earned": 2 },
  "pineapplesEarned": 2,
  "intent": "feature",
  "businessUpdate": {
    "progress_delta": 3,
    "traction_signal": "Landing page shipped",
    "valuation_adjustment": "up"
  }
}
```

**Side Effects:**
- Inserts user message + assistant message into `messages`
- Logs `prompt` activity event
- Updates `progress_score` on `projects` if applicable
- Updates valuation range if adjustment is "up"
- Creates traction signal events (`feature_shipped`, `customer_added`, `revenue_logged`)
- Awards pineapples via `reward_ledger` (1 🍍 per prompt + 1 🍍 bonus for tagged prompts)

**Rate Limit:** 60 prompts/project/hour — exceeding returns `429`

---

### `PUT /api/chat/[messageId]`

Edit an existing user message. Rolls back all previous side effects (progress, valuation, activity events), re-runs AI to generate a fresh response, and re-applies new effects. **Pineapples are NOT re-awarded** on edits to prevent farming.

**Request Body:**
```json
{
  "message": "updated message text",
  "tag": "feature"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": { "id": "...", "content": "updated text", "tag": "feature" },
  "pineapplesEarned": 0
}
```

**Rollback Actions:**
- Reverses `progress_score` delta from original prompt
- Reverses `valuation_low` / `valuation_high` deltas
- Deletes associated `activity_events` (prompt + traction signal)
- Updates the paired assistant message with new AI response
- Re-creates activity events with new rollback metadata

---

### `DELETE /api/chat/[messageId]`

Delete a user message and its paired assistant response. Fully reverses all side effects.

**Response:**
```json
{ "success": true }
```

**Rollback Actions:**
- Reverses `progress_score`, `valuation_low`, `valuation_high` deltas
- Deducts earned pineapples from `profiles.pineapple_balance`
- Deletes associated `reward_ledger` entries (by `idempotency_key` prefix)
- Deletes associated `activity_events`
- Deletes user message + paired assistant message from `messages`

---

### `POST /api/rewards`

Idempotent pineapple reward endpoint for non-chat events.

**Request Body:**
```json
{
  "userId": "uuid",
  "projectId": "uuid",
  "eventType": "link_github",
  "idempotencyKey": "unique-deterministic-string"
}
```

**Response:**
```json
{
  "rewarded": true,
  "amount": 5,
  "newBalance": 23
}
```

**Reward Schedule:**
| Event | 🍍 Amount |
|-------|-----------|
| `prompt` | 1 |
| `tag_bonus` | +1 |
| `link_linkedin` | 5 |
| `link_github` | 5 |
| `link_website` | 3 |
| `feature_shipped` | 3 |
| `customer_added` | 5 |
| `revenue_logged` | 10 |

---

### `POST /api/offer`

AI-generated instant offer/valuation for a project.

**Request Body:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "offer": {
    "id": "uuid",
    "offer_low": 500,
    "offer_high": 2000,
    "status": "active",
    "expires_at": "..."
  },
  "reasoning": "Based on your 15 logged activities and 3 traction signals...",
  "signals_used": ["Landing page shipped", "3 user interviews", "GitHub linked"]
}
```

**Rate Limit:** 5 offers/project/hour. Old active offers are automatically expired.

---

### `POST /api/redeem`

Submit a pineapple redemption request.

**Request Body:**
```json
{
  "amount": 50,
  "rewardType": "uber_eats"
}
```

**Response:**
```json
{
  "success": true,
  "redemption": { "id": "...", "status": "pending" },
  "newBalance": 12
}
```

**Validation:**
- Minimum 50 🍍 required
- Balance must be sufficient
- Wallet integrity check: `profiles.pineapple_balance` must match sum of `reward_ledger` entries

---

## 🗄 Database Schema

9 tables, all with **Row Level Security (RLS) enabled**:

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│    profiles      │──1:N─│    projects      │──1:N─│    messages      │
│  (users)         │      │  (startups)      │      │  (chat history)  │
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ id (PK → auth)  │      │ id (PK)         │      │ id (PK)         │
│ email            │      │ owner_id (FK)   │      │ project_id (FK) │
│ is_admin         │      │ name            │      │ user_id (FK)    │
│ pineapple_balance│      │ progress_score  │      │ role, content   │
│ ...              │      │ valuation_*     │      │ tag, intent     │
└─────────────────┘      │ status          │      │ pineapples_earned│
                          └─────────────────┘      └─────────────────┘
                                │                         
                                ├──1:N─ activity_events (immutable log)
                                ├──1:N─ listings (marketplace)
                                └──1:N─ offers (AI valuations)

┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  reward_ledger   │      │  redemptions     │      │ analytics_events │
│  (🍍 audit trail)│      │  (cashout reqs)  │      │  (usage tracking)│
├─────────────────┤      ├─────────────────┤      ├─────────────────┤
│ idempotency_key  │      │ amount           │      │ event_name       │
│ reward_amount    │      │ status           │      │ properties       │
│ balance_after    │      │ reward_type      │      │                  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Migration Files

| File | Contents |
|------|----------|
| `001_schema.sql` | 9 tables, `is_admin()` helper function, all RLS policies, auto-profile trigger |
| `002_enable_realtime.sql` | Realtime subscriptions for `profiles`, `projects`, `messages`, `activity_events`, `reward_ledger`, `redemptions`, `listings` |

### Auto-Profile Trigger

When a user signs up via Supabase Auth, a PostgreSQL trigger automatically creates a `profiles` row:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 🔒 Security

### Authentication

- **Supabase Auth** with email/password (Google OAuth optional)
- Session managed via `@supabase/ssr` cookies
- `onAuthStateChange` listener for client-side session management

### Authorization Model

```
┌─────────────────────────────────────────────────┐
│                  Middleware                       │
│  • Public: /, /login, /signup, /marketplace      │
│  • Auth required: all other routes               │
│  • Admin check: /admin → profiles.is_admin       │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│            Row Level Security (RLS)              │
│  • Users: CRUD own data only                     │
│  • Admins: SELECT all via is_admin() function    │
│  • Public: SELECT listed projects/active listings│
│  • activity_events: INSERT only (immutable)      │
│  • reward_ledger: UNIQUE idempotency_key         │
└─────────────────────────────────────────────────┘
```

### Key Security Properties

| Property | Implementation |
|----------|---------------|
| **No Service Role Key** | `anon` key + user JWT + RLS everywhere |
| **Idempotent Rewards** | `idempotency_key UNIQUE` constraint prevents duplicate rewards |
| **Immutable Timeline** | No UPDATE/DELETE policies on `activity_events` for non-admins |
| **Rate Limiting** | 60 prompts/hour, 5 offers/hour |
| **Wallet Integrity** | Redemption API cross-checks `profiles.pineapple_balance` against ledger sum |
| **Anti-Spam** | After rate limit, prompts still work but award 0 pineapples |
| **Admin via RLS** | Admin operations use `is_admin()` SECURITY DEFINER function |

---

## 🚢 Deployment

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "ready for deployment"
   git push origin main
   ```

2. **Import on Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Framework: **Next.js** (auto-detected)

3. **Set Environment Variables in Vercel:**

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `OPENAI_API_KEY` | Your OpenAI API key |

4. **Deploy:**
   ```bash
   vercel deploy
   ```
   Or let Vercel auto-deploy on push.

### Production Build (Local)

```bash
npm run build   # Creates optimized production build
npm run start   # Starts production server
```

### Production Optimizations Active

- **Console stripping** in production builds
- **AVIF / WebP** image formats for smaller payloads
- **Tree-shaking** for `lucide-react` and `recharts`
- **Immutable cache headers** for `/_next/static/` (1 year)
- **Font preloading** with `display: "swap"` (no Flash of Invisible Text)
- **DNS prefetch** for Supabase host
- **`X-Powered-By` header removed** for security

---

## 👤 Admin Setup

1. Sign up for a normal account
2. Open **Supabase Dashboard** → **Table Editor** → `profiles`
3. Find your user row
4. Set `is_admin` to `true`
5. Navigate to `/admin` in the app

The admin panel provides:
- **Overview Dashboard** — total users, projects, prompts, pineapples, listings
- **Users Table** — all profiles with pineapple balances
- **Pending Redemptions** — approve or reject with "Mark Fulfilled" / "Mark Failed"
- **Projects** — all projects across all users

---

## 📋 Acceptance Checklist

A brand new user can do **all** of the following without manual database operations or developer assistance:

- [x] Sign up with email and password
- [x] Create a new project with a name
- [x] Enter the 3-panel builder workspace
- [x] Send a chat prompt and receive an AI response (streamed)
- [x] See the prompt in the activity timeline
- [x] See pineapples awarded (toast + balance update)
- [x] Tag a prompt as "Feature" and see the tag badge
- [x] Link a GitHub URL and receive pineapples
- [x] See progress score update after logging progress
- [x] See traction signals in the business panel
- [x] Edit the "Why I Built This" field
- [x] View UI preview (iframe or fallback) if URL is set
- [x] Navigate to wallet and see correct balance
- [x] View reward history
- [x] Submit a redemption request (if balance ≥ 50)
- [x] Click "Get Vamo Offer" for an AI-generated offer
- [x] Click "List for Sale" and publish a marketplace listing
- [x] View the public marketplace
- [x] Admin dashboard with correct counts
- [x] Pending redemptions visible in admin
- [x] Mark a redemption as fulfilled in admin
- [x] Responsive on mobile, tablet, and desktop
- [x] All RLS policies enforce data isolation

---

## ⚠️ Known Limitations

1. **Redemption fulfillment is manual** — admin marks as fulfilled/failed in the admin panel; no automated Uber Eats API integration.
2. **Google OAuth** is supported by Supabase Auth but requires configuration in the Supabase dashboard (not set up by default).
3. **Screenshot upload** for marketplace listings relies on external URLs — no Supabase Storage integration for direct file upload.
4. **Valuation estimates** are AI-generated and non-binding — always displayed as a range with a disclaimer.
5. **UI Preview iframe** may not load sites that block framing via `X-Frame-Options` — fallback screenshot or placeholder is shown.

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (http://localhost:3000) |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx jest` | Run all 14 unit tests |
| `npx jest --coverage` | Run tests with v8 code coverage report |

---

## 🏗 Architecture Overview

```
                    ┌──────────────────┐
                    │   Landing Page   │  (Public)
                    │   /marketplace   │
                    └────────┬─────────┘
                             │ Auth
                    ┌────────▼─────────┐
                    │  Middleware.ts    │
                    │  (Session Check) │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐    ┌──────▼──────┐    ┌──────▼──────┐
    │  /projects │    │  /builder/* │    │  /wallet    │
    │  /profile  │    │  3-Panel    │    │  /admin     │
    └────────────┘    │  Workspace  │    └─────────────┘
                      └──────┬──────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼──────┐
        │ ChatPanel  │ │ UIPreview │ │ Business   │
        │ (AI Chat)  │ │ (iframe)  │ │ Panel      │
        └─────┬──────┘ └───────────┘ └─────┬──────┘
              │                             │
              ▼                             ▼
        ┌───────────┐               ┌────────────┐
        │ /api/chat │               │ /api/offer │
        │ /api/     │               │ /api/redeem│
        │ rewards   │               │ /api/      │
        └─────┬─────┘               │ rewards    │
              │                     └──────┬─────┘
              └──────────┬─────────────────┘
                         ▼
                 ┌───────────────┐
                 │   Supabase    │
                 │  (PostgreSQL  │
                 │   + Realtime  │
                 │   + Auth)     │
                 └───────┬───────┘
                         │
                 ┌───────▼───────┐
                 │   OpenAI      │
                 │  GPT-4o-mini  │
                 └───────────────┘
```

---

## 📄 License

This project was built for the [Vamo Builder Bounty Competition](https://vamo.ai).

---

<p align="center">
  Made with 🍍 by the Vamo Builder team
</p>
