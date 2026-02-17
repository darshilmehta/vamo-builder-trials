const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  openaiApiKey,
}

export function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  }
}

export function isOpenAIConfigured() {
  return Boolean(openaiApiKey)
}
