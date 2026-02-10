import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

export default async function ProjectsPage() {
    const supabase = createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const { data: projects } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

    const typedProfile = profile as Profile | null;
    const typedProjects = (projects as Project[]) || [];

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
                                {typedProfile?.pineapple_balance ?? 0} 🍍
                            </Button>
                        </Link>
                        {typedProfile?.is_admin && (
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

                {typedProjects.length === 0 ? (
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
                        {typedProjects.map((project) => (
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
