"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Store, ArrowRight } from "lucide-react";
import type { Listing } from "@/lib/types";

type ListingWithProject = Listing & {
    projects: { name: string; progress_score: number } | null;
};

export default function MarketplacePage() {
    const [listings, setListings] = useState<ListingWithProject[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();

        const { data } = await supabase
            .from("listings")
            .select("*, projects(name, progress_score)")
            .eq("status", "active")
            .order("created_at", { ascending: false });

        setListings((data || []) as ListingWithProject[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Realtime: listings updates
    useRealtimeTable({
        table: "listings",
        events: ["INSERT", "UPDATE", "DELETE"],
        onEvent: () => {
            loadData();
        },
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
                <header className="border-b bg-white/80 backdrop-blur-sm">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-8 w-40" />
                    </div>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <div className="mb-8 text-center">
                        <Skeleton className="h-10 w-64 mx-auto mb-2" />
                        <Skeleton className="h-5 w-80 mx-auto" />
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="/vamo_logo.png"
                                alt="Vamo Logo"
                                width={32}
                                height={32}
                                className="w-8 h-8"
                            />
                            <span className="text-xl font-bold">Vamo</span>
                        </Link>
                        <Badge variant="secondary" className="ml-2">
                            Marketplace
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm">Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold">Project Marketplace</h1>
                    <p className="mt-2 text-muted-foreground">
                        Browse startup projects listed by founders
                    </p>
                </div>

                {listings.length === 0 ? (
                    <Card className="mx-auto max-w-md py-16 text-center">
                        <CardContent>
                            <div className="mx-auto mb-4 rounded-full bg-muted p-6 w-fit">
                                <Store className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h2 className="mb-2 text-xl font-semibold">No listings yet</h2>
                            <p className="mb-6 text-muted-foreground">
                                Be the first to list your project on the marketplace!
                            </p>
                            <Link href="/signup">
                                <Button>Get Started</Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((listing) => (
                            <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                                <Card
                                    className="overflow-hidden transition-all hover:shadow-md"
                                >
                                    {listing.screenshots && (listing.screenshots as string[]).length > 0 && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={(listing.screenshots as string[])[0]}
                                            alt={listing.title}
                                            className="h-40 w-full object-cover"
                                        />
                                    )}
                                    <CardHeader>
                                        <CardTitle className="text-lg">{listing.title}</CardTitle>
                                        {listing.description && (
                                            <CardDescription className="line-clamp-2">
                                                {listing.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {listing.asking_price_low != null &&
                                                    listing.asking_price_high != null ? (
                                                    <p className="font-semibold text-green-700">
                                                        ${listing.asking_price_low.toLocaleString()} – $
                                                        {listing.asking_price_high.toLocaleString()}
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Price on request
                                                    </p>
                                                )}
                                            </div>
                                            {listing.projects && (
                                                <Badge variant="secondary">
                                                    {listing.projects.progress_score}% progress
                                                </Badge>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
