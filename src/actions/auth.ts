"use server"

import { revalidatePath } from "next/cache"

import { createSupabaseServerClient } from "@/lib/supabase/server"

export type AuthActionState = {
  status: "idle" | "success" | "error"
  message?: string
}

export const authInitialState: AuthActionState = { status: "idle" }

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  return { email, password }
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData)

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { status: "error", message: error.message }
  }

  revalidatePath("/")
  return { status: "success", message: "Signed in successfully." }
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData)

  if (!email || !password) {
    return { status: "error", message: "Email and password are required." }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { status: "error", message: error.message }
  }

  return {
    status: "success",
    message: "Account created. Check your inbox for the confirmation email.",
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  revalidatePath("/")
}
