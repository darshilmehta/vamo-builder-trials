"use client"

import { createBrowserClient } from "@supabase/ssr"

import { assertSupabaseEnv } from "@/lib/env"

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = assertSupabaseEnv()
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return browserClient
}
