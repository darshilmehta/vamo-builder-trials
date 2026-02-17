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
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                    {messages.length === 0 && (
                        <div className="flex select-none flex-col items-center justify-center py-16 text-center opacity-0 animate-in fade-in duration-700">
                            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100/50 text-5xl shadow-sm ring-1 ring-yellow-200">
                                🍍
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">Welcome to Vamo</h3>
                            <p className="mt-2 max-w-[260px] text-sm text-slate-500">
                                Tell me what you&apos;re building today. I&apos;ll help you track progress and earn pineapples.
                            </p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`group flex w-full gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""
                                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <Avatar className={`h-8 w-8 shrink-0 shadow-sm ring-2 ring-white ${msg.role === "user" ? "bg-primary/10" : "bg-yellow-50"}`}>
                                <AvatarFallback
                                    className={
                                        msg.role === "assistant"
                                            ? "bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700"
                                            : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700"
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
                                className={`flex max-w-[85%] flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"
                                    }`}
                            >
                                <div
                                    className={`relative rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all break-words whitespace-pre-wrap ${msg.role === "user"
                                        ? "bg-slate-900 text-slate-50 rounded-tr-sm"
                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm ring-1 ring-slate-900/5"
                                        }`}
                                >
                                    {msg.content}
                                </div>

                                <div className="flex items-center gap-2 px-1">
                                    {msg.tag && (
                                        <Badge
                                            variant="secondary"
                                            className={`h-5 px-1.5 text-[10px] uppercase tracking-wider font-semibold shadow-sm ${getTagColor(msg.tag)} border-0`}
                                        >
                                            {msg.tag}
                                        </Badge>
                                    )}
                                    {msg.pineapples_earned > 0 && (
                                        <span className="flex items-center text-[10px] font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded-full ring-1 ring-yellow-200/50">
                                            +{msg.pineapples_earned} 🍍
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-400 font-medium">
                                        {timeAgo(msg.created_at)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <Avatar className="h-8 w-8 shrink-0 shadow-sm ring-2 ring-white">
                                <AvatarFallback className="bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-700">
                                    <Bot className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm border border-slate-100 ring-1 ring-slate-900/5">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.2s]" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-2" />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t bg-white/50 p-4 backdrop-blur-sm">
                <div className="flex flex-col gap-3">
                    {/* Tag selector */}
                    <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-2">
                        {TAG_OPTIONS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() =>
                                    setSelectedTag(selectedTag === t.value ? null : t.value)
                                }
                                className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-all ${selectedTag === t.value
                                    ? t.color + " ring-2 ring-primary ring-offset-1 shadow-sm"
                                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
                                    }`}
                            >
                                <Tag className={`h-3 w-3 ${selectedTag === t.value ? "opacity-100" : "opacity-50 group-hover:opacity-75"}`} />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative flex rounded-xl bg-white shadow-sm ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1 transition-all">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="min-h-[44px] max-h-[120px] w-full resize-none border-0 bg-transparent py-3 pl-4 pr-12 text-sm placeholder:text-slate-400 focus-visible:ring-0"
                            rows={1}
                            disabled={isBusy}
                        />
                        <div className="absolute bottom-1.5 right-1.5">
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isBusy}
                                size="icon"
                                className={`h-8 w-8 rounded-lg transition-all ${input.trim() ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90" : "bg-slate-100 text-slate-400"}`}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex justify-between px-1">
                        <p className="text-[10px] text-slate-400">
                            <strong>Tip:</strong> Tag your progress to earn more pineapples 🍍
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
