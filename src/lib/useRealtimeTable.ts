"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type PostgresEvent = "INSERT" | "UPDATE" | "DELETE";

interface UseRealtimeTableOptions {
  /** The Postgres table name to subscribe to */
  table: string;
  /** Optional Postgres change filter, e.g. "project_id=eq.abc-123" */
  filter?: string;
  /** Which events to listen to (defaults to all three) */
  events?: PostgresEvent[];
  /** Callback fired for every matching change */
  onEvent: (
    eventType: PostgresEvent,
    payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>
  ) => void;
  /** Set false to temporarily disable the subscription */
  enabled?: boolean;
}

// Counter for unique channel names
let channelCounter = 0;

/**
 * Reusable hook that subscribes to Supabase Realtime Postgres changes
 * on a single table, with an optional row-level filter.
 *
 * Cleans up the channel on unmount or when deps change.
 */
export function useRealtimeTable({
  table,
  filter,
  events = ["INSERT", "UPDATE", "DELETE"],
  onEvent,
  enabled = true,
}: UseRealtimeTableOptions) {
  // Keep onEvent stable via ref so callers don't need to memoize
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  // Keep events ref stable
  const eventsRef = useRef(events);
  eventsRef.current = events;

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabaseBrowserClient();
    const id = ++channelCounter;
    const channelName = `rt-${table}-${filter ?? "all"}-${id}`;

    // Build subscription opts — use "*" to catch all events in one listener
    const opts: Record<string, string> = {
      event: "*",
      schema: "public",
      table,
    };
    if (filter) {
      opts.filter = filter;
    }

    const channel: RealtimeChannel = supabase
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        opts,
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          const eventType = payload.eventType as PostgresEvent;
          // Only fire callback if this event type is in our desired list
          if (eventsRef.current.includes(eventType)) {
            onEventRef.current(eventType, payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}
