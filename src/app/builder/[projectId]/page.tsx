"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { trackEvent } from "@/lib/analytics";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { UIPreview } from "@/components/builder/UIPreview";
import { BusinessPanel } from "@/components/builder/BusinessPanel";
import { LLMLoadingProvider, useLLMLoading } from "@/components/LLMLoadingContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
    usePanelRef,
} from "@/components/ui/resizable";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Wallet,
    ShoppingCart,
    Sparkles,
    Loader2,
    ArrowLeft,
    MessageSquare,
    Monitor,
    BarChart3,
    PanelLeftClose,
    PanelLeftOpen,
    PanelRightClose,
    PanelRightOpen,
} from "lucide-react";
import type { Project, Profile } from "@/lib/types";

export default function BuilderPage({
    params,
}: {
    params: { projectId: string };
}) {
    return (
        <LLMLoadingProvider>
            <BuilderPageContent params={params} />
        </LLMLoadingProvider>
    );
}

function BuilderPageContent({
    params,
}: {
    params: { projectId: string };
}) {
    const { isLLMLoading, startLLMCall, endLLMCall } = useLLMLoading();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [editingName, setEditingName] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [offerDialog, setOfferDialog] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [offer, setOffer] = useState<{
        offer_low: number;
        offer_high: number;
        reasoning: string;
        signals_used: string[];
    } | null>(null);
    const [listingDialog, setListingDialog] = useState(false);
    const [listingLoading, setListingLoading] = useState(false);
    const [listingTitle, setListingTitle] = useState("");
    const [listingDesc, setListingDesc] = useState("");
    const [listingPriceLow, setListingPriceLow] = useState("");
    const [listingPriceHigh, setListingPriceHigh] = useState("");
    const [urlDialog, setUrlDialog] = useState(false);
    const [projectUrl, setProjectUrl] = useState("");
    const chatPanelRef = usePanelRef();
    const businessPanelRef = usePanelRef();
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(true);
    const [businessCollapsed, setBusinessCollapsed] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }
            setUserId(user.id);

            const { data: prof } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single();

            const { data: proj } = await supabase
                .from("projects")
                .select("*")
                .eq("id", params.projectId)
                .single();

            if (!proj) {
                router.push("/projects");
                return;
            }

            setProfile(prof as Profile);
            setProject(proj as Project);
            setProjectName(proj.name);
            setProjectUrl(proj.url || "");
            setListingTitle(proj.name);
            setLoading(false);

            trackEvent("page_view", { path: `/builder/${params.projectId}` });
        }
        load();
    }, [params.projectId, router, refreshKey]);

    // Realtime: profile balance changes
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

    // Realtime: project changes
    useRealtimeTable({
        table: "projects",
        filter: `id=eq.${params.projectId}`,
        events: ["UPDATE"],
        onEvent: (_eventType, payload) => {
            const updated = payload.new as Project;
            setProject(updated);
            setProjectName(updated.name);
            setProjectUrl(updated.url || "");
        },
    });

    function handleMessageSent() {
        setRefreshKey((k) => k + 1);
        // Refresh profile for pineapple balance
        const supabase = getSupabaseBrowserClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single()
                    .then(({ data }) => {
                        if (data) setProfile(data as Profile);
                    });
            }
        });
        supabase
            .from("projects")
            .select("*")
            .eq("id", params.projectId)
            .single()
            .then(({ data }) => {
                if (data) setProject(data as Project);
            });
    }

    async function updateProjectName() {
        if (!projectName.trim()) return;
        const supabase = getSupabaseBrowserClient();
        await supabase
            .from("projects")
            .update({ name: projectName.trim(), updated_at: new Date().toISOString() })
            .eq("id", params.projectId);
        setProject((prev) =>
            prev ? { ...prev, name: projectName.trim() } : prev
        );
        setEditingName(false);
    }

    async function updateProjectUrl() {
        const supabase = getSupabaseBrowserClient();
        await supabase
            .from("projects")
            .update({ url: projectUrl.trim() || null, updated_at: new Date().toISOString() })
            .eq("id", params.projectId);
        setProject((prev) =>
            prev ? { ...prev, url: projectUrl.trim() || null } : prev
        );
        setUrlDialog(false);
        toast.success("Project URL updated!");
    }

    async function handleGetOffer() {
        setOfferDialog(true);
        setOfferLoading(true);
        startLLMCall();
        setOffer(null);

        try {
            const res = await fetch("/api/offer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: params.projectId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setOffer({
                offer_low: data.offer.offer_low,
                offer_high: data.offer.offer_high,
                reasoning: data.reasoning,
                signals_used: data.signals_used || [],
            });
            trackEvent("offer_requested", {
                projectId: params.projectId,
                offerId: data.offer.id,
            });
            setRefreshKey((k) => k + 1);
        } catch {
            toast.error("Failed to generate offer");
            setOfferDialog(false);
        } finally {
            setOfferLoading(false);
            endLLMCall();
        }
    }

    async function handlePublishListing() {
        setListingLoading(true);
        try {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            // Get timeline snapshot
            const { data: timeline } = await supabase
                .from("activity_events")
                .select("*")
                .eq("project_id", params.projectId)
                .order("created_at", { ascending: true });

            const { error } = await supabase.from("listings").insert({
                project_id: params.projectId,
                user_id: user.id,
                title: listingTitle,
                description: listingDesc,
                asking_price_low: parseInt(listingPriceLow) || project?.valuation_low || 0,
                asking_price_high: parseInt(listingPriceHigh) || project?.valuation_high || 0,
                timeline_snapshot: timeline,
                metrics: {
                    progress_score: project?.progress_score,
                },
            });

            if (error) throw error;

            // Update project status
            await supabase
                .from("projects")
                .update({ status: "listed" })
                .eq("id", params.projectId);

            // Log event
            await supabase.from("activity_events").insert({
                project_id: params.projectId,
                user_id: user.id,
                event_type: "listing_created",
                description: `Listed project for $${listingPriceLow || project?.valuation_low} - $${listingPriceHigh || project?.valuation_high}`,
            });

            trackEvent("listing_created", { projectId: params.projectId });
            toast.success("Project listed on marketplace! 🎉");
            setListingDialog(false);
            setRefreshKey((k) => k + 1);
        } catch {
            toast.error("Failed to create listing");
        } finally {
            setListingLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen flex-col">
                <div className="border-b p-4">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="flex flex-1">
                    <Skeleton className="h-full w-[300px]" />
                    <Skeleton className="h-full flex-1" />
                    <Skeleton className="h-full w-[360px]" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between border-b bg-white px-4 py-2">
                <div className="flex items-center gap-3">
                    <Link href="/projects">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    {editingName ? (
                        <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            onBlur={updateProjectName}
                            onKeyDown={(e) => e.key === "Enter" && updateProjectName()}
                            className="h-8 w-full max-w-[200px]"
                            autoFocus
                        />
                    ) : (
                        <h1
                            className="cursor-pointer text-lg font-semibold hover:text-primary truncate max-w-[150px] sm:max-w-[300px]"
                            onClick={() => setEditingName(true)}
                            title={project?.name}
                        >
                            {project?.name}
                        </h1>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/wallet">
                        <Badge
                            variant="outline"
                            className="cursor-pointer gap-1 px-3 py-1 text-sm hover:bg-muted"
                        >
                            🍍 {profile?.pineapple_balance ?? 0}
                        </Badge>
                    </Link>
                    {(project?.progress_score || 0) >= 20 && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={isLLMLoading}
                            onClick={() => {
                                setListingTitle(project?.name || "");
                                setListingPriceLow(String(project?.valuation_low || ""));
                                setListingPriceHigh(String(project?.valuation_high || ""));
                                setListingDialog(true);
                            }}
                        >
                            <ShoppingCart className="h-3.5 w-3.5" />
                            List for Sale
                        </Button>
                    )}
                    {(project?.progress_score || 0) >= 10 && (
                        <Button size="sm" className="gap-1" onClick={handleGetOffer} disabled={isLLMLoading}>
                            <Sparkles className="h-3.5 w-3.5" />
                            Get Vamo Offer
                        </Button>
                    )}
                </div>
            </header>

            {/* Desktop Layout: resizable panels */}
            <div className="hidden flex-1 overflow-hidden xl:flex">
                <ResizablePanelGroup direction="horizontal" className="h-full" key={previewVisible ? "with-preview" : "without-preview"}>
                    {/* Chat Panel */}
                    <ResizablePanel
                        panelRef={chatPanelRef}
                        defaultSize={previewVisible ? "22%" : "40%"}
                        minSize="15%"
                        maxSize={previewVisible ? "40%" : "60%"}
                        collapsible
                        collapsedSize="0%"
                        onResize={(size: any) => setChatCollapsed(String(size) === "0%")}
                        className="flex flex-col"
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b px-3 py-1.5">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Chat
                                </span>
                                <div className="flex items-center gap-1">
                                    {!previewVisible && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setPreviewVisible(true)}
                                            title="Show Preview"
                                        >
                                            <Monitor className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => chatPanelRef.current?.collapse()}
                                    >
                                        <PanelLeftClose className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <ChatPanel
                                    projectId={params.projectId}
                                    onMessageSent={handleMessageSent}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle />

                    {/* Preview Panel (center, conditionally rendered) */}
                    {previewVisible && (
                        <>
                            <ResizablePanel
                                defaultSize="56%"
                                minSize="20%"
                                className="flex flex-col"
                            >
                                <div className="flex h-full flex-col">
                                    <div className="flex items-center justify-between border-b px-3 py-1.5">
                                        <div className="flex items-center gap-2">
                                            {chatCollapsed && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => chatPanelRef.current?.expand()}
                                                >
                                                    <PanelLeftOpen className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                <Monitor className="h-3 w-3" /> Preview
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {businessCollapsed && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => businessPanelRef.current?.expand()}
                                                >
                                                    <PanelRightOpen className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => setPreviewVisible(false)}
                                                title="Hide Preview"
                                            >
                                                <PanelLeftClose className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <UIPreview
                                            url={project?.url || null}
                                            screenshotUrl={project?.screenshot_url || null}
                                            onOpenSettings={() => setUrlDialog(true)}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle />
                        </>
                    )}

                    {/* Business Panel */}
                    <ResizablePanel
                        panelRef={businessPanelRef}
                        defaultSize={previewVisible ? "22%" : "60%"}
                        minSize="15%"
                        maxSize={previewVisible ? "40%" : "85%"}
                        collapsible
                        collapsedSize="0%"
                        onResize={(size: any) => setBusinessCollapsed(String(size) === "0%")}
                        className="flex flex-col"
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b px-3 py-1.5">
                                <div className="flex items-center gap-2">
                                    {!previewVisible && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setPreviewVisible(true)}
                                            title="Show Preview"
                                        >
                                            <Monitor className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" /> Business
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => businessPanelRef.current?.collapse()}
                                >
                                    <PanelRightClose className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <BusinessPanel
                                    projectId={params.projectId}
                                    refreshKey={refreshKey}
                                />
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* Mobile/Tablet Layout: Tabs */}
            <div className="flex flex-1 flex-col overflow-hidden xl:hidden">
                <Tabs defaultValue="chat" className="flex flex-1 flex-col">
                    <TabsList className="mx-4 mt-2 grid w-auto grid-cols-3">
                        <TabsTrigger value="chat" className="gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="gap-1">
                            <Monitor className="h-3.5 w-3.5" />
                            Preview
                        </TabsTrigger>
                        <TabsTrigger value="business" className="gap-1">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Business
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="chat" className="flex-1 overflow-hidden">
                        <ChatPanel
                            projectId={params.projectId}
                            onMessageSent={handleMessageSent}
                        />
                    </TabsContent>
                    <TabsContent value="preview" className="flex-1 overflow-hidden">
                        <UIPreview
                            url={project?.url || null}
                            screenshotUrl={project?.screenshot_url || null}
                            onOpenSettings={() => setUrlDialog(true)}
                        />
                    </TabsContent>
                    <TabsContent value="business" className="flex-1 overflow-hidden">
                        <BusinessPanel
                            projectId={params.projectId}
                            refreshKey={refreshKey}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Offer Dialog */}
            <Dialog open={offerDialog} onOpenChange={setOfferDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>🍍 Vamo Offer</DialogTitle>
                        <DialogDescription>
                            Non-binding estimate based on your logged activity
                        </DialogDescription>
                    </DialogHeader>
                    {offerLoading ? (
                        <div className="space-y-4 py-4">
                            <Skeleton className="h-8 w-2/3 mx-auto" />
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : offer ? (
                        <div className="space-y-4 py-2">
                            <div className="rounded-lg bg-green-50 p-4 text-center">
                                <p className="text-2xl font-bold text-green-700">
                                    ${offer.offer_low.toLocaleString()} – $
                                    {offer.offer_high.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-1">Reasoning</p>
                                <p className="text-sm text-muted-foreground">
                                    {offer.reasoning}
                                </p>
                            </div>
                            {offer.signals_used.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium mb-1">Signals Used</p>
                                    <div className="flex flex-wrap gap-1">
                                        {offer.signals_used.map((s, i) => (
                                            <Badge key={i} variant="secondary" className="text-xs">
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <p className="text-xs text-muted-foreground italic">
                                This is a non-binding estimate based on your logged activity
                                only.
                            </p>
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setOfferDialog(false)}>
                            Dismiss
                        </Button>
                        {offer && (
                            <Button
                                onClick={() => {
                                    setOfferDialog(false);
                                    setListingTitle(project?.name || "");
                                    setListingPriceLow(String(offer.offer_low));
                                    setListingPriceHigh(String(offer.offer_high));
                                    setListingDialog(true);
                                }}
                            >
                                List for Sale
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Listing Dialog */}
            <Dialog open={listingDialog} onOpenChange={setListingDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>List Project for Sale</DialogTitle>
                        <DialogDescription>
                            Create a marketplace listing for your project
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={listingTitle}
                                onChange={(e) => setListingTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                value={listingDesc}
                                onChange={(e) => setListingDesc(e.target.value)}
                                placeholder="Describe your project to potential buyers..."
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Price Low ($)</label>
                                <Input
                                    type="number"
                                    value={listingPriceLow}
                                    onChange={(e) => setListingPriceLow(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Price High ($)</label>
                                <Input
                                    type="number"
                                    value={listingPriceHigh}
                                    onChange={(e) => setListingPriceHigh(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setListingDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePublishListing}
                            disabled={listingLoading || !listingTitle.trim()}
                        >
                            {listingLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Publish Listing
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* URL Dialog */}
            <Dialog open={urlDialog} onOpenChange={setUrlDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Project URL</DialogTitle>
                        <DialogDescription>
                            Link your Lovable, Replit, or external project URL
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        value={projectUrl}
                        onChange={(e) => setProjectUrl(e.target.value)}
                        placeholder="https://your-project.lovable.app"
                    />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setUrlDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={updateProjectUrl}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
