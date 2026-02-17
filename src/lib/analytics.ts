"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function trackEvent(
    eventName: string,
    properties: Record<string, unknown> = {}
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
    } catch (error) {
        console.error("Failed to track event:", error);
    }
}
