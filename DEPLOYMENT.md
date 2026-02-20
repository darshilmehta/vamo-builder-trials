# 🚢 Vamo — Deployment & Startup Guide

This guide walks you through deploying Vamo from a fresh clone to a live production URL.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Supabase Setup](#3-supabase-setup)
4. [Run Locally](#4-run-locally)
5. [Deploy to Vercel](#5-deploy-to-vercel)
6. [Post-Deployment Checklist](#6-post-deployment-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| **Node.js** | v18 or later — [Download](https://nodejs.org/) |
| **npm** | v9+ (comes with Node.js) |
| **Git** | Latest — [Download](https://git-scm.com/) |
| **Supabase Account** | Free tier works — [supabase.com](https://supabase.com) |
| **OpenAI Account** | API key required — [platform.openai.com](https://platform.openai.com) |
| **Vercel Account** | Free tier works — [vercel.com](https://vercel.com) |

---

## 2. Local Development Setup

### Clone the Repository

```bash
git clone https://github.com/<your-username>/vamo-builder-trials.git
cd vamo-builder-trials
```

### Install Dependencies

```bash
npm install
```

### Create Environment File

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual keys:

```env
# Supabase — found in Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# OpenAI — found at platform.openai.com/api-keys
OPENAI_API_KEY=sk-proj-...
```

> **⚠️ Security:**
> - `.env.local` is listed in `.gitignore` — it will **never** be committed
> - The `VITE_SUPABASE_ANON_KEY` is a **public** key — safe for the client
> - `OPENAI_API_KEY` is **server-only** — never exposed to the browser
> - **No service role key** is used anywhere in the codebase

---

## 3. Supabase Setup

### 3.1 Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **New Project**
3. Choose an organization and give it a name
4. Set a database password (save it securely)
5. Select a region close to your users
6. Click **Create new project** and wait for it to provision

### 3.2 Run Database Migrations

You need to run two SQL migration files in order:

#### Migration 1: Schema (9 tables + RLS + triggers)

1. Go to **SQL Editor** in the Supabase Dashboard
2. Click **New query**
3. Copy and paste the entire contents of `supabase/migrations/001_schema.sql`
4. Click **Run**
5. Verify success — you should see "Success. No rows returned"

This creates:
- `profiles` — user profiles (auto-created on signup)
- `projects` — startup projects
- `messages` — AI chat messages
- `activity_events` — immutable activity timeline
- `reward_ledger` — pineapple audit trail
- `redemptions` — cashout requests
- `listings` — marketplace listings
- `offers` — AI-generated offers
- `analytics_events` — usage tracking
- `is_admin()` function — helper for admin RLS policies
- `handle_new_user()` trigger — auto-creates profile row on signup
- All RLS policies for every table

#### Migration 2: Enable Realtime

1. In **SQL Editor**, click **New query**
2. Copy and paste the entire contents of `supabase/migrations/002_enable_realtime.sql`
3. Click **Run**

This enables Supabase Realtime subscriptions for live data updates on 7 tables.

### 3.3 Verify Setup

Go to **Table Editor** in the Supabase Dashboard and confirm all 9 tables exist:

| Table | Rows Expected |
|-------|--------------|
| `profiles` | 0 (auto-populated on signup) |
| `projects` | 0 |
| `messages` | 0 |
| `activity_events` | 0 |
| `reward_ledger` | 0 |
| `redemptions` | 0 |
| `listings` | 0 |
| `offers` | 0 |
| `analytics_events` | 0 |

### 3.4 Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (it usually is by default)
3. (Optional) **Disable email confirmation** for development:
   - Go to **Authentication** → **Settings**
   - Under "Email", toggle off "Confirm email"

### 3.5 (Optional) Enable Google OAuth

1. Go to **Authentication** → **Providers** → **Google**
2. Toggle it on
3. Enter your Google OAuth Client ID and Secret
4. Set the redirect URL to your Vercel domain or `http://localhost:3000/auth/callback`

### 3.6 Get Your API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon / public key** → `VITE_SUPABASE_ANON_KEY`

> **⚠️ Never use the `service_role` key.** This project is designed to work entirely with the anon key + user JWT + RLS policies.

---

## 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Verify It Works

1. **Landing page** loads at `/`
2. **Sign up** at `/signup` — a `profiles` row is auto-created
3. **Create a project** at `/projects/new`
4. **Enter builder** at `/builder/[projectId]` — 3-panel layout visible
5. **Send a chat message** — AI response streams back

### Set Yourself as Admin

1. Sign up for an account
2. Go to Supabase Dashboard → **Table Editor** → `profiles`
3. Click on your user row
4. Change `is_admin` from `false` to `true`
5. Save
6. Navigate to `/admin` in the app

---

## 5. Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "initial deployment"
   git push origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)

3. **Import** your GitHub repository

4. Vercel auto-detects Next.js — no framework config needed

5. **Add Environment Variables** in the Vercel project settings:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `OPENAI_API_KEY` | Your OpenAI API key |

6. Click **Deploy**

7. Wait for the build to complete — you'll get a `.vercel.app` preview URL

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Deploy
vercel deploy

# For production deployment
vercel deploy --prod
```

### Update Supabase Redirect URLs

After deploying, update Supabase to allow the new domain:

1. Go to **Authentication** → **URL Configuration**
2. Add your Vercel URL to **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/**`

---

## 6. Post-Deployment Checklist

- [ ] Landing page loads at your Vercel URL
- [ ] Sign up works and creates a profile
- [ ] Login works and redirects to `/projects`
- [ ] Project creation works
- [ ] Builder workspace loads with 3 panels
- [ ] AI chat responds (verify `OPENAI_API_KEY` is set)
- [ ] Pineapples are awarded on chat prompts
- [ ] Wallet page shows correct balance
- [ ] Marketplace page loads
- [ ] Admin page accessible (after setting `is_admin = true`)
- [ ] No console errors in production
- [ ] Mobile responsive layout works

---

## 7. Troubleshooting

### "Supabase environment variables are missing"

- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after changing `.env.local`
- On Vercel, ensure env vars are set for the correct environment (Production / Preview)

### "AI service or project not found"

- Verify `OPENAI_API_KEY` is set in `.env.local` (locally) or Vercel env vars
- Ensure the key is valid and has credits on [platform.openai.com](https://platform.openai.com)

### "RLS policy violation" or "new row violates row-level security policy"

- Ensure all migrations ran successfully
- Check that the `is_admin()` function was created
- Verify the auto-profile trigger exists: **Database** → **Functions** → `handle_new_user`

### Chat messages not appearing in real-time

- Ensure Migration 002 (Realtime) was run
- Check **Database** → **Replication** to verify tables are in the `supabase_realtime` publication

### Admin page redirects to /projects

- Verify `is_admin` is set to `true` in the `profiles` table for your user
- The middleware checks this on every request to `/admin`

### Build fails on Vercel

- Ensure all dependencies are listed in `package.json`
- Check the build logs for TypeScript errors
- Run `npm run build` locally first to validate

### Iframe preview says "Preview unavailable"

- Some websites block framing via `X-Frame-Options` — this is expected
- Fallback shows screenshot (if set) or placeholder with "Open in new tab" link

---

## Environment Variables Reference

| Variable | Required | Client/Server | Description |
|----------|----------|--------------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Client + Server | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Client + Server | Supabase anon/public key |
| `OPENAI_API_KEY` | ✅ | Server only | OpenAI API key for chat and offers |

> **Confirmation:** No `SUPABASE_SERVICE_ROLE_KEY` is used anywhere in this codebase. All database operations use the anon key + authenticated user JWT + RLS policies.

---

<p align="center">🍍 Happy deploying!</p>
