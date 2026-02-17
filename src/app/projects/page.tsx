"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
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
import { signOutAction } from "@/actions/auth";
import { Plus, LogOut, Wallet, Shield } from "lucide-react";
import type { Project, Profile } from "@/lib/types";

export default function ProjectsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
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

        const { data: projs } = await supabase
            .from("projects")
            .select("*")
            .eq("owner_id", user.id)
            .order("created_at", { ascending: false });

        setProfile(prof as Profile | null);
        setProjects((projs as Project[]) || []);
        setLoading(false);
    }, [router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Realtime: projects list updates
    useRealtimeTable({
        table: "projects",
        filter: userId ? `owner_id=eq.${userId}` : undefined,
        events: ["INSERT", "UPDATE", "DELETE"],
        enabled: !!userId,
        onEvent: () => {
            loadData();
        },
    });

    // Realtime: profile updates (balance)
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

    function getStatusColor(status: string) {
        switch (status) {
            case "active":
                return "bg-green-100 text-green-700";
            case "listed":
                return "bg-blue-100 text-blue-700";
            case "sold":
                return "bg-purple-100 text-purple-700";
            case "archived":
                return "bg-gray-100 text-gray-700";
            default:
                return "";
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
                <header className="border-b bg-white/80 backdrop-blur-sm">
                    <div className="container mx-auto flex items-center justify-between px-4 py-4">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <div className="mb-8 flex items-center justify-between">
                        <Skeleton className="h-10 w-48" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link href="/projects" className="text-xl font-bold">
                            <span className="text-2xl">🍍</span> Vamo
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/wallet">
                            <Button variant="outline" size="sm" className="gap-2">
                                <Wallet className="h-4 w-4" />
                                {profile?.pineapple_balance ?? 0} 🍍
                            </Button>
                        </Link>
                        {profile?.is_admin && (
                            <Link href="/admin">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Shield className="h-4 w-4" />
                                    Admin
                                </Button>
                            </Link>
                        )}
                        <form action={signOutAction}>
                            <Button variant="ghost" size="sm" className="gap-2">
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Your Projects</h1>
                        <p className="text-muted-foreground">
                            Build, track progress, and earn pineapples
                        </p>
                    </div>
                    <Link href="/projects/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            New Project
                        </Button>
                    </Link>
                </div>

                {projects.length === 0 ? (
                    <Card className="py-16 text-center">
                        <CardContent>
                            <div className="mx-auto mb-4 text-6xl">🍍</div>
                            <h2 className="mb-2 text-xl font-semibold">No projects yet</h2>
                            <p className="mb-6 text-muted-foreground">
                                Create your first project to start earning pineapples
                            </p>
                            <Link href="/projects/new">
                                <Button className="gap-2">
                                    <Plus className="h-4 w-4" />
                                    Create Project
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/builder/${project.id}`}
                                className="group"
                            >
                                <Card className="h-full transition-all hover:shadow-md hover:border-primary/20">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                                {project.name}
                                            </CardTitle>
                                            <Badge
                                                variant="secondary"
                                                className={getStatusColor(project.status)}
                                            >
                                                {project.status}
                                            </Badge>
                                        </div>
                                        {project.description && (
                                            <CardDescription className="line-clamp-2">
                                                {project.description}
                                            </CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Progress</span>
                                            <span className="font-medium">
                                                {project.progress_score}%
                                            </span>
                                        </div>
                                        <div className="mt-2 h-2 rounded-full bg-secondary">
                                            <div
                                                className="h-full rounded-full bg-primary transition-all"
                                                style={{
                                                    width: `${Math.min(project.progress_score, 100)}%`,
                                                }}
                                            />
                                        </div>
                                        {project.valuation_low > 0 && (
                                            <p className="mt-3 text-sm text-muted-foreground">
                                                Valuation: ${project.valuation_low.toLocaleString()} – $
                                                {project.valuation_high.toLocaleString()}
                                            </p>
                                        )}
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
