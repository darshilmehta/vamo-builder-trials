"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { trackEvent } from "@/lib/analytics";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { UIPreview } from "@/components/builder/UIPreview";
import { BusinessPanel } from "@/components/builder/BusinessPanel";
import { LLMLoadingProvider, useLLMLoading } from "@/components/LLMLoadingContext";
import { Header } from "@/components/Header";
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
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
import {
    ShoppingCart,
    Sparkles,
    Loader2,
    MessageSquare,
    Monitor,
    BarChart3,
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

            // Check if a listing already exists for this project
            const { data: existingListing } = await supabase
                .from("listings")
                .select("id")
                .eq("project_id", params.projectId)
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            const listingData = {
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
                status: "active",
            };

            let error;
            if (existingListing) {
                // Update existing listing
                ({ error } = await supabase
                    .from("listings")
                    .update(listingData)
                    .eq("id", existingListing.id));
            } else {
                // Create new listing
                ({ error } = await supabase.from("listings").insert(listingData));
            }

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

    const builderActions = (
        <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            disabled={isLLMLoading || (project?.progress_score || 0) < 20}
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
                    </span>
                </TooltipTrigger>
                {(project?.progress_score || 0) < 20 && (
                    <TooltipContent>Reach 20% progress to list</TooltipContent>
                )}
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span tabIndex={0}>
                        <Button
                            size="sm"
                            className="gap-1 gradient-orange text-white border-0"
                            onClick={handleGetOffer}
                            disabled={isLLMLoading || (project?.progress_score || 0) < 10}
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Get Vamo Offer
                        </Button>
                    </span>
                </TooltipTrigger>
                {(project?.progress_score || 0) < 10 && (
                    <TooltipContent>Reach 10% progress for offers</TooltipContent>
                )}
            </Tooltip>
        </div>
    );

    return (
        <div className="flex h-screen flex-col overflow-hidden">
            {/* Header using shared component */}
            <Header variant="builder" profile={profile} actions={builderActions} />
            {/* Inline project name editor (overlaid or below header) */}
            <div className="flex items-center gap-2 border-b bg-background px-4 py-1.5">
                {editingName ? (
                    <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onBlur={updateProjectName}
                        onKeyDown={(e) => e.key === "Enter" && updateProjectName()}
                        className="h-7 w-full max-w-[250px] text-sm"
                        autoFocus
                    />
                ) : (
                    <h2
                        className="cursor-pointer text-sm font-medium hover:text-primary truncate max-w-[250px] sm:max-w-[400px]"
                        onClick={() => setEditingName(true)}
                        title={project?.name}
                    >
                        📁 {project?.name}
                    </h2>
                )}
            </div>

            {/* Desktop Layout: resizable panels */}
            <div className="hidden flex-1 overflow-hidden xl:flex">
                <ResizablePanelGroup direction="horizontal" className="h-full" key={previewVisible ? "with-preview" : "without-preview"}>
                    {/* Chat Panel */}
                    <ResizablePanel
                        panelRef={chatPanelRef}
                        defaultSize={previewVisible ? 25 : 40}
                        minSize={5}
                        collapsible
                        collapsedSize={0}
                        onResize={(size: { asPercentage: number; inPixels: number }) => {
                            const isCollapsed = size.asPercentage === 0;
                            if (chatCollapsed !== isCollapsed) setChatCollapsed(isCollapsed);
                        }}
                        className={`flex flex-col transition-all duration-300 ease-in-out`}
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b px-3 py-1.5 bg-background">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" /> Chat
                                </span>
                                <div className="flex items-center gap-1">
                                    {/* Toolbar controlled by floating dock */}
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden bg-muted/30 dark:bg-transparent">
                                <ChatPanel
                                    projectId={params.projectId}
                                    onMessageSent={handleMessageSent}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors w-1 data-[resize-handle-state=hover]:w-1.5 data-[resize-handle-state=drag]:w-1.5 z-10" />

                    {/* Preview Panel (center, conditionally rendered) */}
                    {previewVisible && (
                        <>
                            <ResizablePanel
                                defaultSize={50}
                                minSize={20}
                                className="flex flex-col"
                            >
                                <div className="flex h-full flex-col">
                                    <div className="flex items-center justify-between border-b px-3 py-1.5 bg-background">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                                <Monitor className="h-3 w-3" /> Preview
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {/* Toolbar controlled by floating dock */}
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden bg-background">
                                        <UIPreview
                                            url={project?.url || null}
                                            screenshotUrl={project?.screenshot_url || null}
                                            onOpenSettings={() => setUrlDialog(true)}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>

                            <ResizableHandle withHandle className="bg-border/50 hover:bg-primary/20 transition-colors w-1 data-[resize-handle-state=hover]:w-1.5 data-[resize-handle-state=drag]:w-1.5 z-10" />
                        </>
                    )}

                    {/* Business Panel */}
                    <ResizablePanel
                        panelRef={businessPanelRef}
                        defaultSize={previewVisible ? 25 : 60}
                        minSize={5}
                        collapsible
                        collapsedSize={0}
                        onResize={(size: { asPercentage: number; inPixels: number }) => {
                            const isCollapsed = size.asPercentage === 0;
                            if (businessCollapsed !== isCollapsed) setBusinessCollapsed(isCollapsed);
                        }}
                        className={`flex flex-col transition-all duration-300 ease-in-out`}
                    >
                        <div className="flex h-full flex-col">
                            <div className="flex items-center justify-between border-b px-3 py-1.5 bg-background">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                        <BarChart3 className="h-3 w-3" /> Business
                                    </span>
                                </div>
                                {/* Toolbar controlled by floating dock */}
                            </div>
                            <div className="flex-1 overflow-hidden bg-slate-50/50 dark:bg-transparent">
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

            {/* Floating Dock Panel Toggler (Always Visible Pill) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 hidden xl:flex z-50">
                <div className="flex h-14 items-center gap-2 rounded-full border bg-card/95 px-3 py-1 shadow-xl backdrop-blur ring-1 ring-border">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full transition-all duration-300 ${!chatCollapsed ? "bg-primary text-primary-foreground shadow-md scale-100" : "text-muted-foreground hover:bg-muted hover:text-foreground scale-90"}`}
                        onClick={() => {
                            if (chatCollapsed) {
                                chatPanelRef.current?.expand();
                                // Defer resize to after expand animation
                                setTimeout(() => {
                                    chatPanelRef.current?.resize(previewVisible ? 25 : 40);
                                }, 50);
                            } else {
                                chatPanelRef.current?.collapse();
                            }
                        }}
                        title={chatCollapsed ? "Show Chat" : "Hide Chat"}
                    >
                        <MessageSquare className="h-5 w-5" />
                    </Button>
                    <div className="h-5 w-px bg-slate-200" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full transition-all duration-300 ${previewVisible ? "bg-primary text-primary-foreground shadow-md scale-100" : "text-muted-foreground hover:bg-muted hover:text-foreground scale-90"}`}
                        onClick={() => setPreviewVisible(!previewVisible)}
                        title={previewVisible ? "Hide Preview" : "Show Preview"}
                    >
                        <Monitor className="h-5 w-5" />
                    </Button>
                    <div className="h-5 w-px bg-slate-200" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-10 w-10 rounded-full transition-all duration-300 ${!businessCollapsed ? "bg-primary text-primary-foreground shadow-md scale-100" : "text-muted-foreground hover:bg-muted hover:text-foreground scale-90"}`}
                        onClick={() => {
                            if (businessCollapsed) {
                                businessPanelRef.current?.expand();
                                // Defer resize to after expand animation
                                setTimeout(() => {
                                    businessPanelRef.current?.resize(previewVisible ? 25 : 60);
                                }, 50);
                            } else {
                                businessPanelRef.current?.collapse();
                            }
                        }}
                        title={businessCollapsed ? "Show Business" : "Hide Business"}
                    >
                        <BarChart3 className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
