"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MessageSquare, Share2, TrendingUp, Calendar, Check, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Listing } from "@/lib/types";

export function ListingSidebar({
    listing,
    email,
    isOwner = false,
}: {
    listing: Listing & { projects: { progress_score: number; users_count?: number; revenue_monthly?: number } | null };
    email: string | null;
    isOwner?: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const [isDelisting, setIsDelisting] = useState(false);
    const router = useRouter();

    function handleShare() {
        if (typeof window !== "undefined") {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            toast.success("Link copied to clipboard!");
            setTimeout(() => setCopied(false), 2000);
        }
    }

    async function handleDelist() {
        if (!confirm("Are you sure you want to delist this project? It will no longer be visible in the marketplace.")) return;

        setIsDelisting(true);
        const supabase = getSupabaseBrowserClient();

        try {
            const { error } = await supabase
                .from("listings")
                .update({ status: "delisted" })
                .eq("id", listing.id);

            if (error) throw error;

            toast.success("Project delisted from marketplace");
            router.push("/projects");
            router.refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delist project";
            toast.error(message);
        } finally {
            setIsDelisting(false);
        }
    }

    return (
        <div className="space-y-6">
            <Card className="border-primary/10 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/30">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Acquisition Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {listing.asking_price_low != null && listing.asking_price_high != null ? (
                        <div className="text-center py-6 bg-green-500/[0.03] rounded-xl border border-green-500/10 mb-6">
                            <div className="text-3xl font-black text-green-600">
                                ${listing.asking_price_low.toLocaleString()} – ${listing.asking_price_high.toLocaleString()}
                            </div>
                            <div className="text-xs font-bold text-green-600/70 mt-2 uppercase tracking-widest">Official Asking Range</div>
                        </div>
                    ) : (
                        <div className="text-xl font-bold text-center py-6 text-muted-foreground bg-muted/20 rounded-xl mb-6 italic">
                            Price on Request
                        </div>
                    )}

                    <div className="space-y-3">
                        {isOwner ? (
                            <Button
                                variant="destructive"
                                className="w-full gap-2 font-bold"
                                size="lg"
                                onClick={handleDelist}
                                disabled={isDelisting}
                            >
                                <Trash2 className="h-4 w-4" />
                                {isDelisting ? "Delisting..." : "Delist Project"}
                            </Button>
                        ) : (
                            <Button className="w-full gap-2 font-bold shadow-md shadow-primary/20" size="lg" asChild>
                                {email ? (
                                    <a href={`mailto:${email}?subject=Inquiry about ${listing.title}`}>
                                        <MessageSquare className="h-4 w-4" />
                                        Contact Founder
                                    </a>
                                ) : (
                                    <span className="opacity-50 cursor-not-allowed">
                                        <ShieldCheck className="h-4 w-4" />
                                        Verified Inquiry Only
                                    </span>
                                )}
                            </Button>
                        )}
                        <Button variant="outline" className="w-full gap-2 font-semibold" onClick={handleShare}>
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                            {copied ? "Link Copied!" : "Share Listing"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-primary/5">
                <CardHeader>
                    <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Progress
                        </span>
                        <Badge variant="secondary" className="font-black text-primary bg-primary/5 border-primary/10">
                            {listing.projects?.progress_score || 0}%
                        </Badge>
                    </div>
                    {listing.projects?.users_count && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-blue-500" />
                                Users
                            </span>
                            <span className="text-sm font-bold">
                                {listing.projects.users_count.toLocaleString()}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Listed On
                        </span>
                        <span className="text-sm font-bold">
                            {new Date(listing.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

