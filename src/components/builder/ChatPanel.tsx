"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { trackEvent } from "@/lib/analytics";
import { useLLMLoading } from "@/components/LLMLoadingContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Bot, User, Tag } from "lucide-react";
import type { Message, MessageTag } from "@/lib/types";

interface ChatPanelProps {
    projectId: string;
    onMessageSent: () => void;
}

const TAG_OPTIONS: { value: MessageTag; label: string; color: string }[] = [
    { value: "feature", label: "Feature", color: "bg-blue-100 text-blue-700" },
    {
        value: "customer",
        label: "Customer",
        color: "bg-green-100 text-green-700",
    },
    {
        value: "revenue",
        label: "Revenue",
        color: "bg-purple-100 text-purple-700",
    },
    { value: "ask", label: "Ask", color: "bg-orange-100 text-orange-700" },
];

function getTagColor(tag: string | null) {
    const found = TAG_OPTIONS.find((t) => t.value === tag);
    return found?.color || "bg-gray-100 text-gray-700";
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

export function ChatPanel({ projectId, onMessageSent }: ChatPanelProps) {
    const { isLLMLoading, startLLMCall, endLLMCall } = useLLMLoading();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [selectedTag, setSelectedTag] = useState<MessageTag>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const isBusy = loading || isLLMLoading;

    // Load messages
    useEffect(() => {
        async function loadMessages() {
            const supabase = getSupabaseBrowserClient();
            const { data } = await supabase
                .from("messages")
                .select("*")
                .eq("project_id", projectId)
                .order("created_at", { ascending: true });

            setMessages((data as Message[]) || []);
            setInitialLoading(false);
        }
        loadMessages();
    }, [projectId]);

    // Realtime: new messages in this project
    useRealtimeTable({
        table: "messages",
        filter: `project_id=eq.${projectId}`,
        events: ["INSERT"],
        onEvent: (_eventType, payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
                // Avoid duplicates from optimistic updates
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
        },
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function handleSend() {
        if (!input.trim() || isBusy) return;

        const messageText = input.trim();
        setInput("");
        setLoading(true);
        startLLMCall();

        // Optimistically add user message
        const tempUserMsg: Message = {
            id: `temp-${Date.now()}`,
            project_id: projectId,
            user_id: "",
            role: "user",
            content: messageText,
            extracted_intent: null,
            tag: selectedTag,
            pineapples_earned: 0,
            created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, tempUserMsg]);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    message: messageText,
                    tag: selectedTag,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to send message");
            }

            // Replace temp message and add assistant message
            setMessages((prev) => {
                const filtered = prev.filter((m) => m.id !== tempUserMsg.id);
                const assistantMsg = data.message as Message;
                // Re-fetch all messages to get accurate state
                return [
                    ...filtered,
                    {
                        ...tempUserMsg,
                        id: `user-${Date.now()}`,
                        pineapples_earned: 0,
                    },
                    {
                        ...assistantMsg,
                        pineapples_earned: data.pineapplesEarned || 0,
                    },
                ];
            });

            if (data.pineapplesEarned > 0) {
                toast.success(`+${data.pineapplesEarned} 🍍 earned!`);
            }

            trackEvent("prompt_sent", {
                projectId,
                messageId: data.message?.id,
            });

            onMessageSent();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to send message"
            );
            // Keep the input so user doesn't lose their message
            setInput(messageText);
            setMessages((prev) =>
                prev.filter((m) => m.id !== tempUserMsg.id)
            );
        } finally {
            setLoading(false);
            endLLMCall();
            setSelectedTag(null);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    if (initialLoading) {
        return (
            <div className="flex h-full flex-col gap-4 p-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-2/3 ml-auto" />
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="py-12 text-center">
                            <div className="mb-3 text-4xl">🍍</div>
                            <p className="text-sm font-medium">Welcome to your workspace!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Tell Vamo what you&apos;re working on to start earning
                                pineapples
                            </p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""
                                }`}
                        >
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback
                                    className={
                                        msg.role === "assistant"
                                            ? "bg-yellow-100 text-yellow-600"
                                            : "bg-primary text-primary-foreground"
                                    }
                                >
                                    {msg.role === "assistant" ? (
                                        <Bot className="h-4 w-4" />
                                    ) : (
                                        <User className="h-4 w-4" />
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <div
                                className={`flex max-w-[80%] flex-col gap-1 ${msg.role === "user" ? "items-end" : ""
                                    }`}
                            >
                                <div
                                    className={`rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap ${msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-2">
                                    {msg.tag && (
                                        <Badge
                                            variant="secondary"
                                            className={`text-xs ${getTagColor(msg.tag)}`}
                                        >
                                            {msg.tag}
                                        </Badge>
                                    )}
                                    {msg.pineapples_earned > 0 && (
                                        <span className="text-xs font-medium text-yellow-600">
                                            +{msg.pineapples_earned} 🍍
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {timeAgo(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="bg-yellow-100 text-yellow-600">
                                    <Bot className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.2s]" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Tag selector */}
            <div className="flex flex-wrap gap-1 px-4 pb-2 overflow-x-auto">
                {TAG_OPTIONS.map((t) => (
                    <button
                        key={t.value}
                        onClick={() =>
                            setSelectedTag(selectedTag === t.value ? null : t.value)
                        }
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${selectedTag === t.value
                            ? t.color + " ring-2 ring-offset-1 ring-primary"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            }`}
                    >
                        <Tag className="h-3 w-3" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Input */}
            <div className="border-t p-4">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="What did you work on today?"
                        className="min-h-[40px] max-h-[120px] resize-none"
                        rows={1}
                        disabled={isBusy}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isBusy}
                        size="icon"
                        className="shrink-0"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
