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

        // ── Wallet Ledger Integrity Check ──────────────────────────
        // Verify that the profile balance matches the sum of all
        // ledger entries. If it doesn't, the wallet may have been
        // tampered with (e.g. pineapples manually increased).
        const { data: ledgerEntries, error: ledgerFetchError } = await supabase
            .from("reward_ledger")
            .select("reward_amount")
            .eq("user_id", user.id);

        if (ledgerFetchError) {
            console.error(
                "Ledger integrity check failed – could not fetch ledger:",
                ledgerFetchError
            );
            return NextResponse.json(
                {
                    error:
                        "We encountered an internal issue while verifying your wallet. " +
                        "Please contact support to resolve this.",
                },
                { status: 500 }
            );
        }

        const computedBalance = (ledgerEntries || []).reduce(
            (sum: number, entry: { reward_amount: number }) =>
                sum + entry.reward_amount,
            0
        );

        if (computedBalance !== profile.pineapple_balance) {
            console.error(
                `⚠️ WALLET INTEGRITY MISMATCH for user ${user.id}: ` +
                    `profile.pineapple_balance=${profile.pineapple_balance}, ` +
                    `computed ledger sum=${computedBalance}`
            );
            return NextResponse.json(
                {
                    error:
                        "We detected an inconsistency in your wallet. " +
                        "Your redemption cannot be processed at this time. " +
                        "Please contact support to resolve this issue.",
                },
                { status: 403 }
            );
        }
        // ── End Integrity Check ────────────────────────────────────

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
