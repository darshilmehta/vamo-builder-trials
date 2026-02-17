import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { assertSupabaseEnv } from "@/lib/env";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { supabaseUrl, supabaseAnonKey } = assertSupabaseEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => ({
          name: cookie.name,
          value: cookie.value,
        }));
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can be called from Server Components where cookies are read-only.
          // This is safe to ignore if middleware is refreshing sessions.
        }
      },
    },
  });
}
