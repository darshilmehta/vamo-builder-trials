"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Wallet as WalletIcon, Loader2 } from "lucide-react";
import type {
    Profile,
    RewardLedgerEntry,
    Redemption,
} from "@/lib/types";
import { MIN_REDEMPTION_AMOUNT } from "@/lib/types";

export default function WalletPage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [rewards, setRewards] = useState<RewardLedgerEntry[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [redeemDialog, setRedeemDialog] = useState(false);
    const [redeemAmount, setRedeemAmount] = useState("");
    const [redeemLoading, setRedeemLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [userId, setUserId] = useState<string | null>(null);
    const PAGE_SIZE = 20;

    const loadData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;
        setUserId(user.id);

        const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        const { data: rw } = await supabase
            .from("reward_ledger")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        const { data: rd } = await supabase
            .from("redemptions")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        setProfile(prof as Profile);
        setRewards((rw as RewardLedgerEntry[]) || []);
        setRedemptions((rd as Redemption[]) || []);
        setLoading(false);

        trackEvent("page_view", { path: "/wallet" });
    }, [page]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Realtime: profile balance updates
    useRealtimeTable({
        table: "profiles",
        filter: userId ? `id=eq.${userId}` : undefined,
        events: ["UPDATE"],
        enabled: !!userId,
        onEvent: (_eventType, payload) => {
            const updated = payload.new as Profile;
            setProfile(updated);
        },
    });

    // Realtime: new reward ledger entries
    useRealtimeTable({
        table: "reward_ledger",
        filter: userId ? `user_id=eq.${userId}` : undefined,
        events: ["INSERT"],
        enabled: !!userId,
        onEvent: () => {
            // Re-fetch to maintain pagination
            loadData();
        },
    });

    // Realtime: redemption status changes
    useRealtimeTable({
        table: "redemptions",
        filter: userId ? `user_id=eq.${userId}` : undefined,
        events: ["INSERT", "UPDATE"],
        enabled: !!userId,
        onEvent: () => {
            loadData();
        },
    });

    async function handleRedeem() {
        const amount = parseInt(redeemAmount);
        if (!amount || amount < MIN_REDEMPTION_AMOUNT) {
            toast.error(`Minimum redemption is ${MIN_REDEMPTION_AMOUNT} 🍍`);
            return;
        }
        if (amount > (profile?.pineapple_balance || 0)) {
            toast.error("Insufficient balance");
            return;
        }

        setRedeemLoading(true);
        try {
            const res = await fetch("/api/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setProfile((prev) =>
                prev ? { ...prev, pineapple_balance: data.newBalance } : prev
            );
            setRedeemDialog(false);
            setRedeemAmount("");
            toast.success(
                "Redemption submitted! You'll receive your reward within 48 hours. 🎉"
            );
            trackEvent("reward_redeemed", { amount });
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Redemption failed"
            );
        } finally {
            setRedeemLoading(false);
        }
    }

    function getStatusBadge(status: string) {
        switch (status) {
            case "pending":
                return (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                        Pending
                    </Badge>
                );
            case "fulfilled":
                return (
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Fulfilled
                    </Badge>
                );
            case "failed":
                return (
                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                        Failed
                    </Badge>
                );
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen p-8">
                <div className="mx-auto max-w-4xl space-y-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
            <div className="container mx-auto max-w-4xl px-4 py-8">
                <Link
                    href="/projects"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to projects
                </Link>

                {/* Balance Card */}
                <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-green-50">
                    <CardContent className="flex items-center justify-between p-8">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">
                                Pineapple Balance
                            </p>
                            <p className="text-5xl font-bold">
                                {profile?.pineapple_balance ?? 0}{" "}
                                <span className="text-3xl">🍍</span>
                            </p>
                        </div>
                        <Button
                            size="lg"
                            className="gap-2"
                            disabled={
                                (profile?.pineapple_balance || 0) < MIN_REDEMPTION_AMOUNT
                            }
                            onClick={() => setRedeemDialog(true)}
                        >
                            <WalletIcon className="h-5 w-5" />
                            Redeem
                        </Button>
                    </CardContent>
                    {(profile?.pineapple_balance || 0) < MIN_REDEMPTION_AMOUNT && (
                        <div className="px-8 pb-4">
                            <p className="text-xs text-muted-foreground">
                                Earn at least {MIN_REDEMPTION_AMOUNT} 🍍 to redeem for Uber
                                Eats credits
                            </p>
                        </div>
                    )}
                </Card>

                {/* Reward History */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Reward History</CardTitle>
                        <CardDescription>All pineapples earned and redeemed</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {rewards.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No rewards yet. Start building to earn pineapples! 🍍
                            </p>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead className="text-right">Amount</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rewards.map((entry) => (
                                            <TableRow key={entry.id}>
                                                <TableCell className="text-sm">
                                                    {new Date(entry.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">
                                                        {entry.event_type.replace(/_/g, " ")}
                                                    </span>
                                                </TableCell>
                                                <TableCell
                                                    className={`text-right font-medium ${entry.reward_amount >= 0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                        }`}
                                                >
                                                    {entry.reward_amount >= 0 ? "+" : ""}
                                                    {entry.reward_amount} 🍍
                                                </TableCell>
                                                <TableCell className="text-right text-sm">
                                                    {entry.balance_after}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="mt-4 flex justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={page === 0}
                                        onClick={() => setPage((p) => p - 1)}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={rewards.length < PAGE_SIZE}
                                        onClick={() => setPage((p) => p + 1)}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Redemption History */}
                {redemptions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Redemption History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Reward Type</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {redemptions.map((r) => (
                                        <TableRow key={r.id}>
                                            <TableCell className="text-sm">
                                                {new Date(r.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {r.amount} 🍍
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {r.reward_type === "uber_eats"
                                                    ? "Uber Eats Credit"
                                                    : r.reward_type}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(r.status)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Redeem Dialog */}
            <Dialog open={redeemDialog} onOpenChange={setRedeemDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redeem Pineapples</DialogTitle>
                        <DialogDescription>
                            Convert your pineapples to Uber Eats credits
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Current Balance</p>
                            <p className="text-3xl font-bold">
                                {profile?.pineapple_balance} 🍍
                            </p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Amount to Redeem</label>
                            <Input
                                type="number"
                                min={MIN_REDEMPTION_AMOUNT}
                                max={profile?.pineapple_balance || 0}
                                value={redeemAmount}
                                onChange={(e) => setRedeemAmount(e.target.value)}
                                placeholder={`Min ${MIN_REDEMPTION_AMOUNT}`}
                            />
                        </div>
                        <div className="rounded-md bg-muted p-3 text-sm">
                            <p className="font-medium">Uber Eats Credit</p>
                            <p className="text-muted-foreground text-xs">
                                You&apos;ll receive your credit within 48 hours
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRedeemDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleRedeem}
                            disabled={redeemLoading || !redeemAmount}
                        >
                            {redeemLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Confirm Redemption
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
