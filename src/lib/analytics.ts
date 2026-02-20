"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Fire-and-forget analytics tracking.
 * Deliberately NOT async at the call site — callers should NOT await this.
 * This avoids blocking the main thread for a non-critical background insert.
 */
export function trackEvent(
    eventName: string,
    properties: Record<string, unknown> = {}
) {
    // Intentionally not awaited — runs in the background
    void _trackEvent(eventName, properties);
}

async function _trackEvent(
    eventName: string,
    properties: Record<string, unknown>
) {
    try {
        const supabase = getSupabaseBrowserClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        await supabase.from("analytics_events").insert({
            user_id: user.id,
            project_id: (properties.projectId as string) || null,
            event_name: eventName,
            properties,
        });
    } catch {
        // Silently swallow — analytics failure should never affect the user
    }
}
