"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DollarSign,
    Heart,
    TrendingUp,
    Github,
    Linkedin,
    Globe,
    Link2,
    Check,
    Loader2,
    Rocket,
    Users,
    Banknote,
    Activity,
    Clock,
} from "lucide-react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import type { Project, ActivityEvent } from "@/lib/types";

interface BusinessPanelProps {
    projectId: string;
    refreshKey: number;
}

function getProgressLabel(score: number) {
    if (score <= 25) return "Early Stage";
    if (score <= 50) return "Building";
    if (score <= 75) return "Traction";
    return "Growth";
}

function getProgressColor(score: number) {
    if (score <= 25) return "bg-red-500";
    if (score <= 50) return "bg-yellow-500";
    if (score <= 75) return "bg-green-500";
    return "bg-blue-500";
}

function timeAgo(dateStr: string) {
    const seconds = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / 1000
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function eventIcon(type: string) {
    switch (type) {
        case "feature_shipped":
            return <Rocket className="h-3.5 w-3.5 text-blue-500" />;
        case "customer_added":
            return <Users className="h-3.5 w-3.5 text-green-500" />;
        case "revenue_logged":
            return <Banknote className="h-3.5 w-3.5 text-purple-500" />;
        case "prompt":
            return <Activity className="h-3.5 w-3.5 text-gray-500" />;
        case "reward_earned":
            return <span className="text-sm">🍍</span>;
        case "project_created":
            return <Rocket className="h-3.5 w-3.5 text-yellow-500" />;
        case "link_linkedin":
            return <Linkedin className="h-3.5 w-3.5 text-blue-600" />;
        case "link_github":
            return <Github className="h-3.5 w-3.5" />;
        case "link_website":
            return <Globe className="h-3.5 w-3.5 text-green-600" />;
        case "offer_received":
            return <DollarSign className="h-3.5 w-3.5 text-green-500" />;
        case "listing_created":
            return <TrendingUp className="h-3.5 w-3.5 text-purple-500" />;
        default:
            return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
}

export function BusinessPanel({ projectId, refreshKey }: BusinessPanelProps) {
    const [project, setProject] = useState<Project | null>(null);
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [tractionSignals, setTractionSignals] = useState<ActivityEvent[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingWhy, setEditingWhy] = useState(false);
    const [whyText, setWhyText] = useState("");
    const [linkDialog, setLinkDialog] = useState<string | null>(null);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkLoading, setLinkLoading] = useState(false);
    const [linkError, setLinkError] = useState<string | null>(null);
    const [linkedAssets, setLinkedAssets] = useState<Record<string, boolean>>({});

    const loadData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();

        const { data: proj } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .single();

        if (proj) {
            setProject(proj as Project);
            setWhyText(proj.why_built || "");
        }

        // Load activity events
        const { data: evts } = await supabase
            .from("activity_events")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(10);

        setEvents((evts as ActivityEvent[]) || []);

        // Load traction signals for charts and list
        const { data: signals } = await supabase
            .from("activity_events")
            .select("*")
            .eq("project_id", projectId)
            .in("event_type", [
                "feature_shipped",
                "customer_added",
                "revenue_logged",
            ])
            .order("created_at", { ascending: true }); // Ascending for chart calculation

        const rawSignals = (signals as ActivityEvent[]) || [];
        setTractionSignals([...rawSignals].reverse()); // Reverse for list display (descending)

        // Process data for chart
        if (rawSignals.length > 0) {
            const data: any[] = [];
            let features = 0;
            let customers = 0;
            let revenue = 0;

            // Calculate progress increment per signal to simulate history
            // We want the final point to equal the current progress score
            const currentScore = proj ? (proj as Project).progress_score : 0;
            const scorePerSignal = rawSignals.length > 0 ? currentScore / rawSignals.length : 0;
            let cumulativeProgress = 0;

            rawSignals.forEach((signal, index) => {
                if (signal.event_type === "feature_shipped") features++;
                if (signal.event_type === "customer_added") customers++;
                if (signal.event_type === "revenue_logged") revenue++;

                // Add proportional progress score
                cumulativeProgress += scorePerSignal;
                // Ensure the last point matches exactly, otherwise round
                const progress = index === rawSignals.length - 1
                    ? currentScore
                    : Math.round(cumulativeProgress * 10) / 10;

                const date = new Date(signal.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                });

                // Check if last entry is same date to aggregate
                const lastEntry = data[data.length - 1];
                if (lastEntry && lastEntry.date === date) {
                    lastEntry.features = features;
                    lastEntry.customers = customers;
                    lastEntry.revenue = revenue;
                    lastEntry.progress = progress;
                } else {
                    data.push({
                        date,
                        features,
                        customers,
                        revenue,
                        progress,
                    });
                }
            });
            setChartData(data);
        } else {
            setChartData([]);
        }

        // Check linked assets
        const { data: links } = await supabase
            .from("activity_events")
            .select("event_type")
            .eq("project_id", projectId)
            .in("event_type", ["link_linkedin", "link_github", "link_website"]);

        const linked: Record<string, boolean> = {};
        (links || []).forEach((l) => {
            linked[l.event_type as string] = true;
        });
        setLinkedAssets(linked);

        setLoading(false);
    }, [projectId]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    // Realtime: project updates
    useRealtimeTable({
        table: "projects",
        filter: `id=eq.${projectId}`,
        events: ["UPDATE"],
        onEvent: (_eventType, payload) => {
            const updated = payload.new as Project;
            setProject(updated);
            setWhyText(updated.why_built || "");
        },
    });

    // Realtime: activity events
    useRealtimeTable({
        table: "activity_events",
        filter: `project_id=eq.${projectId}`,
        events: ["INSERT"],
        onEvent: () => {
            loadData();
        },
    });

    async function saveWhyBuilt() {
        const supabase = getSupabaseBrowserClient();
        await supabase
            .from("projects")
            .update({ why_built: whyText, updated_at: new Date().toISOString() })
            .eq("id", projectId);
        setProject((prev) => (prev ? { ...prev, why_built: whyText } : prev));
        setEditingWhy(false);
        toast.success("Updated!");
    }

    function validateLinkUrl(url: string, type: string): string | null {
        const trimmed = url.trim();
        if (!trimmed) return "URL is required";

        // Check for valid URL format
        let parsed: URL;
        try {
            parsed = new URL(trimmed);
        } catch {
            return "Please enter a valid URL (e.g. https://example.com)";
        }

        // Must be http or https
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return "URL must start with http:// or https://";
        }

        // Platform-specific domain checks
        const hostname = parsed.hostname.toLowerCase();
        if (type === "linkedin") {
            if (!hostname.endsWith("linkedin.com")) {
                return "Please enter a valid LinkedIn URL (e.g. https://linkedin.com/in/your-profile)";
            }
        } else if (type === "github") {
            if (!hostname.endsWith("github.com")) {
                return "Please enter a valid GitHub URL (e.g. https://github.com/your-username)";
            }
        }

        return null; // valid
    }

    async function handleLinkAsset() {
        if (!linkUrl.trim() || !linkDialog) return;

        const error = validateLinkUrl(linkUrl, linkDialog);
        if (error) {
            setLinkError(error);
            return;
        }

        setLinkLoading(true);
        const supabase = getSupabaseBrowserClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const eventType = `link_${linkDialog}` as string;

        // Insert activity event
        await supabase.from("activity_events").insert({
            project_id: projectId,
            user_id: user.id,
            event_type: eventType,
            description: `Linked ${linkDialog}: ${linkUrl}`,
            metadata: { url: linkUrl },
        });

        // Award pineapples
        const idempotencyKey = `${projectId}-${eventType}`;
        await fetch("/api/rewards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: user.id,
                projectId,
                eventType,
                idempotencyKey,
            }),
        });

        trackEvent("link_added", { projectId, linkType: linkDialog });

        setLinkedAssets((prev) => ({ ...prev, [eventType]: true }));
        setLinkDialog(null);
        setLinkUrl("");
        setLinkError(null);
        setLinkLoading(false);
        toast.success(`${linkDialog} linked! 🍍`);
        loadData();
    }

    if (loading) {
        return (
            <div className="space-y-6 p-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="space-y-6 p-4">
                {/* Valuation Range */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <DollarSign className="h-4 w-4" />
                        Valuation Range
                    </div>
                    {project && (project.valuation_low > 0 || project.valuation_high > 0) ? (
                        <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-lg font-bold text-green-700 break-words leading-tight">
                                ${project.valuation_low.toLocaleString()} – ${project.valuation_high.toLocaleString()}
                            </p>
                            <p className="text-xs text-green-600/70">
                                Estimates based on logged activity only
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm text-muted-foreground">Not yet estimated</p>
                            <p className="text-xs text-muted-foreground/70">
                                Log progress to generate a valuation
                            </p>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Why I Built This */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Heart className="h-4 w-4" />
                        Why I Built This
                    </div>
                    {editingWhy ? (
                        <div className="space-y-2">
                            <Textarea
                                value={whyText}
                                onChange={(e) => setWhyText(e.target.value)}
                                maxLength={1000}
                                rows={4}
                                placeholder="What problem are you solving?"
                            />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {whyText.length}/1000
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingWhy(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button size="sm" onClick={saveWhyBuilt}>
                                        Save
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="cursor-pointer rounded-lg border border-dashed p-3 text-sm transition-colors hover:bg-muted/50"
                            onClick={() => setEditingWhy(true)}
                        >
                            {project?.why_built || (
                                <span className="text-muted-foreground">
                                    Click to add your &quot;why&quot; statement…
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <Separator />

                {/* Progress Score */}
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <TrendingUp className="h-4 w-4" />
                            Progress Score
                        </div>
                        <Badge
                            variant="secondary"
                            className={`text-xs ${(project?.progress_score || 0) <= 25
                                ? "bg-red-100 text-red-700"
                                : (project?.progress_score || 0) <= 50
                                    ? "bg-yellow-100 text-yellow-700"
                                    : (project?.progress_score || 0) <= 75
                                        ? "bg-green-100 text-green-700"
                                        : "bg-blue-100 text-blue-700"
                                }`}
                        >
                            {getProgressLabel(project?.progress_score || 0)}
                        </Badge>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{project?.progress_score || 0}%</span>
                            <span>100%</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-secondary">
                            <div
                                className={`h-full rounded-full transition-all ${getProgressColor(
                                    project?.progress_score || 0
                                )}`}
                                style={{
                                    width: `${Math.min(project?.progress_score || 0, 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Growth Trends */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <TrendingUp className="h-4 w-4" />
                        Growth Trends
                    </div>
                    {chartData.length > 0 ? (
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={chartData}
                                    margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        yAxisId="left"
                                        tick={{ fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        domain={[0, 100]}
                                        tick={{ fontSize: 10 }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={30}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--background))",
                                            borderColor: "hsl(var(--border))",
                                            borderRadius: "var(--radius)",
                                            fontSize: "12px",
                                        }}
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="features"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Features"
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="customers"
                                        stroke="#22c55e"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Customers"
                                    />
                                    <Line
                                        yAxisId="left"
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#a855f7"
                                        strokeWidth={2}
                                        dot={false}
                                        name="Revenue"
                                    />
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="progress"
                                        stroke="#eab308" // Yellow-500
                                        strokeWidth={2}
                                        dot={false}
                                        name="Progress Score"
                                        strokeDasharray="5 5"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="relative flex h-[150px] items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/20">
                            <div className="text-center">
                                <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
                                <p className="text-xs text-muted-foreground">
                                    Not enough data for trends yet
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Traction Signals */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Activity className="h-4 w-4" />
                        Traction Signals
                    </div>
                    {tractionSignals.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            Start logging progress in the chat to see traction signals here.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {tractionSignals.slice(0, 5).map((signal) => (
                                <div
                                    key={signal.id}
                                    className="flex items-start gap-2 rounded-md bg-muted/50 p-2"
                                >
                                    {eventIcon(signal.event_type)}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs truncate">{signal.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {timeAgo(signal.created_at)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <Separator />

                {/* Linked Assets */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Link2 className="h-4 w-4" />
                        Linked Assets
                    </div>
                    <div className="space-y-2">
                        {(
                            [
                                {
                                    key: "linkedin",
                                    icon: <Linkedin className="h-4 w-4" />,
                                    label: "LinkedIn",
                                    reward: "5 🍍",
                                },
                                {
                                    key: "github",
                                    icon: <Github className="h-4 w-4" />,
                                    label: "GitHub",
                                    reward: "5 🍍",
                                },
                                {
                                    key: "website",
                                    icon: <Globe className="h-4 w-4" />,
                                    label: "Website",
                                    reward: "3 🍍",
                                },
                            ] as const
                        ).map((asset) => (
                            <div
                                key={asset.key}
                                className="flex items-center justify-between rounded-md border p-2"
                            >
                                <div className="flex items-center gap-2">
                                    {asset.icon}
                                    <span className="text-sm">{asset.label}</span>
                                </div>
                                {linkedAssets[`link_${asset.key}`] ? (
                                    <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                                        <Check className="h-3 w-3" />
                                        Linked
                                    </Badge>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => setLinkDialog(asset.key)}
                                    >
                                        Link +{asset.reward}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Mini Activity Timeline */}
                <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Recent Activity
                    </div>
                    {events.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No activity yet. Start chatting!
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {events.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex items-start gap-2 text-xs"
                                >
                                    <span className="mt-0.5 shrink-0">
                                        {eventIcon(event.event_type)}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate">
                                            {event.description || event.event_type.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-muted-foreground">
                                        {timeAgo(event.created_at)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Link Asset Dialog */}
            <Dialog
                open={!!linkDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setLinkDialog(null);
                        setLinkUrl("");
                        setLinkError(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Link {linkDialog}</DialogTitle>
                        <DialogDescription>
                            Paste your {linkDialog} URL to earn pineapples
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Input
                            value={linkUrl}
                            onChange={(e) => {
                                setLinkUrl(e.target.value);
                                if (linkError) setLinkError(null);
                            }}
                            placeholder={`https://${linkDialog === "linkedin" ? "linkedin.com/in/your-profile" : linkDialog === "github" ? "github.com/your-username" : "your-site.com"}`}
                            className={linkError ? "border-red-500 focus-visible:ring-red-500" : ""}
                        />
                        {linkError && (
                            <p className="text-xs text-red-500">{linkError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleLinkAsset}
                            disabled={!linkUrl.trim() || linkLoading || !!linkError}
                        >
                            {linkLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Link & Earn 🍍
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </ScrollArea>
    );
}
