import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { REWARD_SCHEDULE, RATE_LIMIT_MAX_PROMPTS_PER_HOUR } from "@/lib/types";

export async function POST(request: Request) {
    try {
        const supabase = createSupabaseServerClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId, projectId, eventType, idempotencyKey } = body;

        if (!eventType || !idempotencyKey) {
            return NextResponse.json(
                { error: "eventType and idempotencyKey are required" },
                { status: 400 }
            );
        }

        // Verify the user matches
        if (userId && userId !== user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check for existing idempotency key
        const { data: existing } = await supabase
            .from("reward_ledger")
            .select("*")
            .eq("idempotency_key", idempotencyKey)
            .single();

        if (existing) {
            return NextResponse.json({
                rewarded: false,
                amount: existing.reward_amount,
                newBalance: existing.balance_after,
                message: "Reward already claimed",
            });
        }

        // Rate limit check for prompts
        if (eventType === "prompt") {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            const { count } = await supabase
                .from("reward_ledger")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("event_type", "prompt")
                .gte("created_at", oneHourAgo);

            if ((count || 0) >= RATE_LIMIT_MAX_PROMPTS_PER_HOUR) {
                return NextResponse.json({
                    rewarded: false,
                    amount: 0,
                    message: "Rate limit reached. Prompts still work but award 0 pineapples.",
                });
            }
        }

        // Calculate reward
        const amount = REWARD_SCHEDULE[eventType] || 0;
        if (amount === 0) {
            return NextResponse.json({
                rewarded: false,
                amount: 0,
                message: "No reward for this event type",
            });
        }

        // Get current balance
        const { data: profile } = await supabase
            .from("profiles")
            .select("pineapple_balance")
            .eq("id", user.id)
            .single();

        const currentBalance = profile?.pineapple_balance || 0;
        const newBalance = currentBalance + amount;

        // Insert ledger entry
        const { error: ledgerError } = await supabase
            .from("reward_ledger")
            .insert({
                user_id: user.id,
                project_id: projectId || null,
                event_type: eventType,
                reward_amount: amount,
                balance_after: newBalance,
                idempotency_key: idempotencyKey,
            });

        if (ledgerError) {
            // Could be a duplicate key conflict
            if (ledgerError.code === "23505") {
                return NextResponse.json({
                    rewarded: false,
                    amount,
                    message: "Reward already claimed",
                });
            }
            return NextResponse.json(
                { error: ledgerError.message },
                { status: 500 }
            );
        }

        // Update balance
        await supabase
            .from("profiles")
            .update({
                pineapple_balance: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        // Log activity event
        await supabase.from("activity_events").insert({
            project_id: projectId || null,
            user_id: user.id,
            event_type: "reward_earned",
            description: `Earned ${amount} 🍍 for ${eventType}`,
            metadata: { amount, eventType },
        });

        return NextResponse.json({
            rewarded: true,
            amount,
            newBalance,
        });
    } catch (error) {
        console.error("Rewards API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
