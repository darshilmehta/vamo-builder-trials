import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ArrowLeft,
    DollarSign,
    TrendingUp,
    Calendar,
    Share2,
    MessageSquare,
    Store,
    CheckCircle2
} from "lucide-react";
import { ListingSidebar } from "@/components/marketplace/ListingSidebar";
import type { Listing, ActivityEvent, Profile } from "@/lib/types";

export default async function ListingPage({ params }: { params: { listingId: string } }) {
    const supabase = createSupabaseServerClient();

    const { data: listing } = await supabase
        .from("listings")
        .select("*, projects(*), profiles(email)")
        .eq("id", params.listingId)
        .single();

    if (!listing) {
        notFound();
    }

    const typedListing = listing as Listing & {
        projects: {
            name: string;
            description: string;
            progress_score: number;
            url: string;
        } | null;
        profiles: { email: string } | null;
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10">
                <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <Link href="/marketplace">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🍍</span>
                            <span className="text-lg font-bold text-gradient-orange hidden sm:inline">Vamo Marketplace</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Sign In
                            </Button>
                        </Link>
                        <Link href="/signup">
                            <Button size="sm" className="gradient-orange text-white border-0">Get Started</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        <div>
                            <div className="flex items-start justify-between">
                                <h1 className="text-3xl font-bold mb-2">{typedListing.title}</h1>
                                {typedListing.status === "active" ? (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                        For Sale
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">{typedListing.status}</Badge>
                                )}
                            </div>
                            <p className="text-muted-foreground text-lg">
                                {typedListing.description}
                            </p>
                        </div>

                        {typedListing.screenshots && (typedListing.screenshots as string[]).length > 0 && (
                            <div className="rounded-xl overflow-hidden border bg-black/5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={(typedListing.screenshots as string[])[0]}
                                    alt="Project Screenshot"
                                    className="w-full h-auto object-cover max-h-[400px]"
                                />
                            </div>
                        )}

                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Store className="h-5 w-5" />
                                About the Project
                            </h2>
                            <Card>
                                <CardContent className="pt-6">
                                    <p className="whitespace-pre-wrap text-muted-foreground">
                                        {typedListing.projects?.description || "No project description provided."}
                                    </p>
                                    {typedListing.projects?.url && (
                                        <div className="mt-4">
                                            <span className="text-sm font-medium mr-2">Live URL:</span>
                                            <a
                                                href={typedListing.projects.url.startsWith("http") ? typedListing.projects.url : `https://${typedListing.projects.url}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline"
                                            >
                                                {typedListing.projects.url}
                                            </a>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                Project Timeline
                            </h2>
                            <Card>
                                <CardContent className="pt-6">
                                    {(typedListing.timeline_snapshot as ActivityEvent[])?.length > 0 ? (
                                        <div className="relative border-l border-muted pl-6 space-y-6">
                                            {((typedListing.timeline_snapshot as ActivityEvent[]) || [])
                                                .slice(0, 10) // Show last 10 events
                                                .map((event, i) => (
                                                    <div key={i} className="relative">
                                                        <div className="absolute -left-[29px] top-1">
                                                            <div className="flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                                                                <CheckCircle2 className="h-3 w-3 text-primary" />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">
                                                                    {event.event_type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(event.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            {event.description && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    {event.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No verified timeline events available.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <ListingSidebar
                            listing={typedListing}
                            email={typedListing.profiles?.email || null}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
