import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { MIN_REDEMPTION_AMOUNT } from "@/lib/types";

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
        const { amount, rewardType = "uber_eats" } = body;

        if (!amount || amount < MIN_REDEMPTION_AMOUNT) {
            return NextResponse.json(
                {
                    error: `Minimum redemption amount is ${MIN_REDEMPTION_AMOUNT} pineapples`,
                },
                { status: 400 }
            );
        }

        // Get current balance
        const { data: profile } = await supabase
            .from("profiles")
            .select("pineapple_balance")
            .eq("id", user.id)
            .single();

        if (!profile) {
            return NextResponse.json(
                { error: "Profile not found" },
                { status: 404 }
            );
        }

        if (profile.pineapple_balance < amount) {
            return NextResponse.json(
                { error: "Insufficient balance" },
                { status: 400 }
            );
        }

        const newBalance = profile.pineapple_balance - amount;

        // Deduct balance
        await supabase
            .from("profiles")
            .update({
                pineapple_balance: newBalance,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        // Insert redemption
        const { data: redemption, error: redemptionError } = await supabase
            .from("redemptions")
            .insert({
                user_id: user.id,
                amount,
                reward_type: rewardType,
                status: "pending",
            })
            .select()
            .single();

        if (redemptionError) {
            // Rollback balance
            await supabase
                .from("profiles")
                .update({ pineapple_balance: profile.pineapple_balance })
                .eq("id", user.id);
            return NextResponse.json(
                { error: redemptionError.message },
                { status: 500 }
            );
        }

        // Insert negative ledger entry
        await supabase.from("reward_ledger").insert({
            user_id: user.id,
            event_type: "redemption",
            reward_amount: -amount,
            balance_after: newBalance,
            idempotency_key: `redemption-${redemption.id}`,
        });

        // Log activity event
        await supabase.from("activity_events").insert({
            user_id: user.id,
            project_id: null,
            event_type: "reward_redeemed",
            description: `Redeemed ${amount} 🍍 for ${rewardType}`,
            metadata: { amount, rewardType, redemptionId: redemption.id },
        });

        return NextResponse.json({
            success: true,
            redemption,
            newBalance,
        });
    } catch (error) {
        console.error("Redeem API error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
