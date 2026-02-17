"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, MessageSquare, Share2, TrendingUp, Calendar, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Listing } from "@/lib/types";

export function ListingSidebar({
    listing,
    email,
}: {
    listing: Listing & { projects: { progress_score: number } | null };
    email: string | null;
}) {
    const [copied, setCopied] = useState(false);

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        Asking Price
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {listing.asking_price_low != null && listing.asking_price_high != null ? (
                        <div className="text-center py-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                            <div className="text-3xl font-bold text-green-700">
                                ${listing.asking_price_low.toLocaleString()} – ${listing.asking_price_high.toLocaleString()}
                            </div>
                            <div className="text-xs text-green-600 mt-1">Estimated Valuation Range</div>
                        </div>
                    ) : (
                        <div className="text-xl font-semibold text-center py-4 text-muted-foreground">
                            Price on Request
                        </div>
                    )}

                    <div className="space-y-2">
                        {email ? (
                            <Button className="w-full gap-2" size="lg" asChild>
                                <a href={`mailto:${email}?subject=Inquiry about ${listing.title}`}>
                                    <MessageSquare className="h-4 w-4" />
                                    Contact Founder
                                </a>
                            </Button>
                        ) : (
                            <Button className="w-full gap-2" size="lg" disabled>
                                <MessageSquare className="h-4 w-4" />
                                Contact Founder (Email hidden)
                            </Button>
                        )}
                        <Button variant="outline" className="w-full gap-2" onClick={handleShare}>
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Share2 className="h-4 w-4" />}
                            {copied ? "Copied!" : "Share Listing"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Project Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Progress Score
                        </span>
                        <Badge variant="secondary" className="text-base">
                            {listing.projects?.progress_score || 0}%
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Listed Date
                        </span>
                        <span className="text-sm font-medium">
                            {new Date(listing.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
