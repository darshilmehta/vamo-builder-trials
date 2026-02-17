"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Monitor,
    Tablet,
    Smartphone,
    RefreshCw,
    ExternalLink,
    Link2,
} from "lucide-react";

interface UIPreviewProps {
    url: string | null;
    screenshotUrl: string | null;
    onOpenSettings: () => void;
}

const DEVICE_WIDTHS = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
};

export function UIPreview({
    url,
    screenshotUrl,
    onOpenSettings,
}: UIPreviewProps) {
    const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
        "desktop"
    );
    const [iframeKey, setIframeKey] = useState(0);
    const [iframeLoading, setIframeLoading] = useState(true);
    const [iframeError, setIframeError] = useState(false);

    function handleRefresh() {
        setIframeKey((k) => k + 1);
        setIframeLoading(true);
        setIframeError(false);
    }

    if (!url) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="rounded-full bg-muted p-6">
                    <Link2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                    <h3 className="font-semibold">No project URL linked</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Link a project URL to see a live preview
                    </p>
                </div>
                <Button variant="outline" onClick={onOpenSettings} className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Set Project URL
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b px-4 py-2">
                <div className="flex items-center gap-1">
                    <Button
                        variant={device === "desktop" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDevice("desktop")}
                    >
                        <Monitor className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={device === "tablet" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDevice("tablet")}
                    >
                        <Tablet className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={device === "mobile" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDevice("mobile")}
                    >
                        <Smartphone className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleRefresh}
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </a>
                </div>
            </div>

            {/* Preview */}
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-muted/30 p-4">
                <div
                    className="relative h-full bg-white shadow-sm rounded-lg overflow-hidden transition-all"
                    style={{
                        width: DEVICE_WIDTHS[device],
                        maxWidth: "100%",
                    }}
                >
                    {iframeLoading && !iframeError && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-32 w-3/4" />
                        </div>
                    )}

                    {iframeError ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                            {screenshotUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={screenshotUrl}
                                    alt="Project screenshot"
                                    className="max-h-[400px] rounded-lg border"
                                />
                            ) : (
                                <div className="rounded-full bg-muted p-4">
                                    <ExternalLink className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Preview unavailable. The site may block iframe embedding.
                            </p>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="gap-2">
                                    Open in new tab
                                    <ExternalLink className="h-3 w-3" />
                                </Button>
                            </a>
                        </div>
                    ) : (
                        <iframe
                            key={iframeKey}
                            src={url}
                            className="h-full w-full border-0"
                            sandbox="allow-scripts allow-same-origin allow-forms"
                            onLoad={() => setIframeLoading(false)}
                            onError={() => {
                                setIframeError(true);
                                setIframeLoading(false);
                            }}
                            title="Project Preview"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
