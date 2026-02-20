import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    ArrowLeft,
    TrendingUp,
    Store,
    Rocket,
    Activity,
    Target,
    BarChart3
} from "lucide-react";
import { ListingSidebar } from "@/components/marketplace/ListingSidebar";
import { Timeline } from "@/components/marketplace/Timeline";
import type { Listing, ActivityEvent } from "@/lib/types";

export default async function ListingPage({ params }: { params: { listingId: string } }) {
    const supabase = createSupabaseServerClient();

    const { data: listing } = await supabase
        .from("listings")
        .select("*, projects(*), profiles(email, full_name)")
        .eq("id", params.listingId)
        .single();

    if (!listing) {
        notFound();
    }

    const { data: { user } } = await supabase.auth.getUser();
    const isOwner = user?.id === listing.user_id;

    const typedListing = listing as Listing & {
        projects: {
            name: string;
            description: string;
            progress_score: number;
            url: string;
            valuation_low?: number;
            valuation_high?: number;
            traction_signals?: string[];
            revenue_monthly?: number;
            users_count?: number;
        } | null;
        profiles: { email: string; full_name: string | null } | null;
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
                <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="icon" className="rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🍍</span>
                            <span className="text-lg font-bold text-gradient-orange hidden sm:inline">Vamo Marketplace</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {!user ? (
                            <>
                                <Link href="/login">
                                    <Button variant="ghost" size="sm">Sign In</Button>
                                </Link>
                                <Link href="/signup">
                                    <Button size="sm" className="gradient-orange text-white border-0 shadow-sm">Get Started</Button>
                                </Link>
                            </>
                        ) : (
                            <Link href="/projects">
                                <Button variant="outline" size="sm">My Projects</Button>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-10 max-w-6xl">
                <div className="grid gap-10 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-4xl font-extrabold tracking-tight">{typedListing.title}</h1>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-bold py-0.5">
                                            {typedListing.projects?.name}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">•</span>
                                        <span className="text-sm text-muted-foreground">
                                            Listed by {typedListing.profiles?.full_name || typedListing.profiles?.email?.split("@")[0]}
                                        </span>
                                    </div>
                                </div>
                                {typedListing.status === "active" ? (
                                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20 font-bold px-3 py-1 text-sm">
                                        For Sale
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="font-bold px-3 py-1 text-sm uppercase">{typedListing.status}</Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-xl leading-relaxed">
                                {typedListing.description}
                            </p>
                        </div>

                        {typedListing.screenshots && (typedListing.screenshots as string[]).length > 0 ? (
                            <div className="rounded-2xl overflow-hidden border bg-black/5 shadow-inner">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={(typedListing.screenshots as string[])[0]}
                                    alt="Project Screenshot"
                                    className="w-full h-auto object-cover max-h-[500px]"
                                />
                            </div>
                        ) : (
                            <div className="h-64 rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-6xl block mb-2 opacity-20">🍍</span>
                                    <span className="text-sm font-medium text-muted-foreground">No screenshot available</span>
                                </div>
                            </div>
                        )}

                        {/* Project Details */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <Store className="h-6 w-6 text-primary" />
                                About the Project
                            </h2>
                            <Card className="border-primary/5 bg-card/50 backdrop-blur-sm">
                                <CardContent className="pt-8 space-y-6">
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Vision & Description</h3>
                                        <p className="whitespace-pre-wrap text-foreground/80 leading-relaxed text-lg">
                                            {typedListing.projects?.description || "No project description provided."}
                                        </p>
                                    </div>

                                    {typedListing.projects?.url && (
                                        <div className="pt-4 border-t border-primary/5">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">Live Demo</h3>
                                            <a
                                                href={typedListing.projects.url.startsWith("http") ? typedListing.projects.url : `https://${typedListing.projects.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline text-lg font-medium inline-flex items-center gap-2"
                                            >
                                                {typedListing.projects.url}
                                                <Target className="h-4 w-4" />
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Platform Metrics */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <BarChart3 className="h-6 w-6 text-blue-500" />
                                Platform Metrics
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Card className="bg-blue-500/[0.03] border-blue-500/10">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <Activity className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Progress Score</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-blue-600">{typedListing.projects?.progress_score || 0}</span>
                                            <span className="text-lg font-bold text-blue-400">/ 100</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Verified stage of development based on Vamo copilot events.</p>
                                    </CardContent>
                                </Card>

                                <Card className="bg-orange-500/[0.03] border-orange-500/10">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-orange-500/10 rounded-lg">
                                                <Rocket className="h-5 w-5 text-orange-600" />
                                            </div>
                                            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Verified Events</span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-orange-600">
                                                {Array.isArray(typedListing.timeline_snapshot) ? typedListing.timeline_snapshot.length : 0}
                                            </span>
                                            <span className="text-sm font-bold text-orange-400 uppercase">logged</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">Total number of significant business and feature updates logged.</p>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Project Timeline */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                <TrendingUp className="h-6 w-6 text-orange-500" />
                                Project Timeline
                            </h2>
                            <Card className="border-orange-500/5">
                                <CardContent className="pt-10">
                                    <Timeline
                                        events={(typedListing.timeline_snapshot as ActivityEvent[]) || []}
                                        itemsPerPage={8}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        <ListingSidebar
                            listing={typedListing}
                            email={typedListing.profiles?.email || null}
                            isOwner={isOwner}
                        />
                    </aside>
                </div>
            </main>
        </div>
    );
}
