"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { Header } from "@/components/Header";
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
import { Store, Search, SlidersHorizontal, ArrowUpDown, Rocket, Activity, Zap } from "lucide-react";
import type { Listing } from "@/lib/types";

type ListingWithProject = Listing & {
    projects: {
        name: string;
        progress_score: number;
        valuation_low?: number;
        valuation_high?: number;
        screenshot_url?: string | null;
    } | null;
};

export default function MarketplacePage() {
    const [listings, setListings] = useState<ListingWithProject[]>([]);
    const [loading, setLoading] = useState(true);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [priceFilter, setPriceFilter] = useState<string>("all"); // all, starter, growth, premium
    const [progressFilter, setProgressFilter] = useState<string>("all"); // all, 0-30, 30-70, 70-100
    const [sortBy, setSortBy] = useState<string>("newest"); // newest, price_asc, price_desc, progress_desc

    const loadData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();

        const { data } = await supabase
            .from("listings")
            .select("*, projects(name, progress_score, valuation_low, valuation_high, screenshot_url)")
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

    const filteredAndSortedListings = listings
        .filter((l) => {
            // Search filter
            const matchesSearch =
                l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

            // Price filter
            let matchesPrice = true;
            const avgPrice = ((l.asking_price_low ?? 0) + (l.asking_price_high ?? 0)) / 2;
            if (priceFilter === "starter") matchesPrice = avgPrice < 5000;
            else if (priceFilter === "growth") matchesPrice = avgPrice >= 5000 && avgPrice < 25000;
            else if (priceFilter === "premium") matchesPrice = avgPrice >= 25000;

            // Progress filter
            let matchesProgress = true;
            const progress = l.projects?.progress_score ?? 0;
            if (progressFilter === "early") matchesProgress = progress < 30;
            else if (progressFilter === "mid") matchesProgress = progress >= 30 && progress < 70;
            else if (progressFilter === "advanced") matchesProgress = progress >= 70;

            return matchesSearch && matchesPrice && matchesProgress;
        })
        .sort((a, b) => {
            if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === "price_asc") return (a.asking_price_low ?? 0) - (b.asking_price_low ?? 0);
            if (sortBy === "price_desc") return (b.asking_price_low ?? 0) - (a.asking_price_low ?? 0);
            if (sortBy === "progress_desc") return (b.projects?.progress_score ?? 0) - (a.projects?.progress_score ?? 0);
            return 0;
        });

    if (loading) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Header variant="public" />
                <main className="mx-auto max-w-7xl px-4 py-8">
                    <div className="mb-8 text-center">
                        <Skeleton className="h-10 w-64 mx-auto mb-2" />
                        <Skeleton className="h-5 w-80 mx-auto" />
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header variant="public" />

            {/* Content */}
            <main className="mx-auto max-w-7xl px-4 py-8">
                <div className="mb-10 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                        Project Marketplace
                    </h1>
                    <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
                        Acquire verified startup projects built by incredible founders.
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            className="w-full rounded-lg border bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                            <select
                                className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none"
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                            >
                                <option value="all">All Prices</option>
                                <option value="starter">Starter (&lt; $5k)</option>
                                <option value="growth">Growth ($5k - $25k)</option>
                                <option value="premium">Premium (&gt; $25k)</option>
                            </select>

                            <select
                                className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none"
                                value={progressFilter}
                                onChange={(e) => setProgressFilter(e.target.value)}
                            >
                                <option value="all">All Progress</option>
                                <option value="early">Early Stage (&lt; 30%)</option>
                                <option value="mid">Scaling (30% - 70%)</option>
                                <option value="advanced">Mature (&gt; 70%)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2 border-l pl-3 ml-1">
                            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                            <select
                                className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="newest">Newest First</option>
                                <option value="price_asc">Price: Low to High</option>
                                <option value="price_desc">Price: High to Low</option>
                                <option value="progress_desc">Progress: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>

                {filteredAndSortedListings.length === 0 ? (
                    <Card className="mx-auto max-w-md py-20 text-center border-dashed">
                        <CardContent>
                            <div className="mx-auto mb-6 rounded-full bg-primary/10 p-8 w-fit">
                                <Store className="h-10 w-10 text-primary" />
                            </div>
                            <h2 className="mb-2 text-2xl font-bold">No projects found</h2>
                            <p className="mb-8 text-muted-foreground">
                                {searchQuery || priceFilter !== "all" || progressFilter !== "all"
                                    ? "Try adjusting your filters to find more projects."
                                    : "Be the first to list your project on the marketplace!"}
                            </p>
                            {!(searchQuery || priceFilter !== "all" || progressFilter !== "all") && (
                                <Link href="/signup">
                                    <Button className="gradient-orange text-white border-0 shadow-lg px-8">Get Started</Button>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredAndSortedListings.map((listing) => (
                            <Link key={listing.id} href={`/marketplace/${listing.id}`} className="group">
                                <Card
                                    className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-primary/10"
                                >
                                    <div className="relative h-48 w-full overflow-hidden">
                                        {listing.projects?.screenshot_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={listing.projects.screenshot_url}
                                                alt={listing.title}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-gradient-to-br from-primary/20 via-primary/5 to-background flex items-center justify-center p-8">
                                                <div className="flex flex-col items-center gap-3 text-primary/40">
                                                    <span className="text-5xl opacity-80">🍍</span>
                                                    <span className="text-xs font-semibold tracking-widest uppercase opacity-60">Vamo Showcase</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                                            <Badge className="bg-background/90 backdrop-blur text-foreground border-primary/20 shadow-sm font-bold">
                                                {listing.projects?.progress_score}%
                                            </Badge>
                                        </div>
                                    </div>

                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
                                                {listing.title}
                                            </CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-bold h-4">
                                                {listing.projects?.name}
                                            </Badge>
                                        </div>
                                        {listing.description && (
                                            <CardDescription className="line-clamp-2 mt-2 leading-relaxed">
                                                {listing.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>

                                    <CardContent>
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-baseline gap-1">
                                                {listing.asking_price_low != null &&
                                                    listing.asking_price_high != null ? (
                                                    <>
                                                        <span className="text-2xl font-bold text-foreground">
                                                            ${(listing.asking_price_low / 1000).toFixed(listing.asking_price_low >= 1000 ? 1 : 0)}k
                                                        </span>
                                                        <span className="text-sm text-muted-foreground font-medium">
                                                            – ${(listing.asking_price_high / 1000).toFixed(listing.asking_price_high >= 1000 ? 1 : 0)}k
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-lg font-semibold text-muted-foreground">
                                                        Price on request
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Verified progress">
                                                        <Rocket className="h-3.5 w-3.5 text-orange-500" />
                                                        <span className="font-medium whitespace-nowrap">
                                                            {listing.projects?.progress_score ?? 0}%
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Logged events">
                                                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="font-medium">
                                                            {Array.isArray(listing.timeline_snapshot) ? listing.timeline_snapshot.length : 0}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                                    View Details
                                                    <Zap className="h-3 w-3 fill-current" />
                                                </div>
                                            </div>
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

