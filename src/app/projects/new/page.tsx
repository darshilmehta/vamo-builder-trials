"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function NewProjectPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setErrors({});

        const formData = new FormData(e.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const description = String(formData.get("description") ?? "").trim();
        const url = String(formData.get("url") ?? "").trim();
        const whyBuilt = String(formData.get("why_built") ?? "").trim();

        // Validation
        const newErrors: Record<string, string> = {};
        if (!name) {
            newErrors.name = "Project name is required";
        }
        if (name.length > 100) {
            newErrors.name = "Project name must be under 100 characters";
        }
        if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
            newErrors.url = "URL must start with http:// or https://";
        }
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const supabase = getSupabaseBrowserClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                toast.error("You must be logged in to create a project");
                router.push("/login");
                return;
            }

            const { data: project, error } = await supabase
                .from("projects")
                .insert({
                    owner_id: user.id,
                    name,
                    description: description || null,
                    url: url || null,
                    why_built: whyBuilt || null,
                })
                .select()
                .single();

            if (error) {
                toast.error(error.message);
                return;
            }

            // Log activity event
            await supabase.from("activity_events").insert({
                project_id: project.id,
                user_id: user.id,
                event_type: "project_created",
                description: `Created project "${name}"`,
            });

            // Track analytics
            trackEvent("project_created", { projectId: project.id });

            toast.success("Project created!");
            router.push(`/builder/${project.id}`);
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="container mx-auto max-w-2xl py-8">
                <Link
                    href="/projects"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to projects
                </Link>

                <Card className="border-primary/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl">Create a New Project</CardTitle>
                        <CardDescription>
                            Set up your project and start tracking your startup progress
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Project Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="My Awesome Startup"
                                    maxLength={100}
                                    required
                                />
                                {errors.name && (
                                    <p className="text-sm text-destructive">{errors.name}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="What does your project do?"
                                    maxLength={500}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="url">External URL</Label>
                                <Input
                                    id="url"
                                    name="url"
                                    type="url"
                                    placeholder="https://my-project.lovable.app"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Link to your Lovable, Replit, or other project URL
                                </p>
                                {errors.url && (
                                    <p className="text-sm text-destructive">{errors.url}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="why_built">Why did you build this?</Label>
                                <Textarea
                                    id="why_built"
                                    name="why_built"
                                    placeholder="What problem are you solving? What's your vision?"
                                    maxLength={1000}
                                    rows={4}
                                />
                            </div>

                            <Button type="submit" className="w-full gradient-orange text-white border-0" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating…
                                    </>
                                ) : (
                                    "Create Project"
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
