"use client";

import { useState } from "react";
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ActivityEvent } from "@/lib/types";

interface TimelineProps {
    events: ActivityEvent[];
    itemsPerPage?: number;
}

export function Timeline({ events, itemsPerPage = 5 }: TimelineProps) {
    const [currentPage, setCurrentPage] = useState(1);

    if (!events || events.length === 0) {
        return (
            <div className="py-10 text-center">
                <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground italic">
                    No verified timeline events available for this project.
                </p>
            </div>
        );
    }

    const sortedEvents = [...events].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const totalPages = Math.ceil(events.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentEvents = sortedEvents.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-8">
            <div className="relative border-l-2 border-primary/10 pl-8 space-y-10 pb-4">
                {currentEvents.map((event, i) => (
                    <div key={startIndex + i} className="relative">
                        <div className="absolute -left-[41px] top-0">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary shadow-sm text-white">
                                <CheckCircle2 className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <span className="text-lg font-bold">
                                    {event.event_type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                                </span>
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    {new Date(event.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            {event.description && (
                                <p className="text-foreground/70 leading-relaxed">
                                    {event.description}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                    <p className="text-sm text-muted-foreground font-medium">
                        Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, events.length)} of {events.length} events
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className={`h-8 w-8 p-0 text-xs ${currentPage === page ? "shadow-md" : ""}`}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="h-8 w-8 p-0"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
