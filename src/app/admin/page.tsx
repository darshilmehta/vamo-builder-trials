"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowLeft,
    Users,
    FolderOpen,
    ShoppingCart,
    DollarSign,
} from "lucide-react";
import type { Profile, Project, Listing, Redemption } from "@/lib/types";

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);
    const [projectCount, setProjectCount] = useState(0);
    const [listingCount, setListingCount] = useState(0);
    const [redemptionCount, setRedemptionCount] = useState(0);
    const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [recentListings, setRecentListings] = useState<(Listing & { projects: { name: string } | null })[]>([]);
    const [pendingRedemptions, setPendingRedemptions] = useState<(Redemption & { profiles: { email: string } | null })[]>([]);

    const loadData = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            router.push("/login");
            return;
        }

        // Check admin
        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (!profile || !(profile as Profile).is_admin) {
            router.push("/projects");
            return;
        }

        // Load stats
        const { count: uc } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true });
        setUserCount(uc || 0);

        const { count: pc } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true });
        setProjectCount(pc || 0);

        const { count: lc } = await supabase
            .from("listings")
            .select("*", { count: "exact", head: true });
        setListingCount(lc || 0);

        const { count: rc } = await supabase
            .from("redemptions")
            .select("*", { count: "exact", head: true });
        setRedemptionCount(rc || 0);

        // Load recent data
        const { data: users } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
        setRecentUsers((users || []) as Profile[]);

        const { data: projects } = await supabase
            .from("projects")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
        setRecentProjects((projects || []) as Project[]);

        const { data: listings } = await supabase
            .from("listings")
            .select("*, projects(name)")
            .order("created_at", { ascending: false })
            .limit(20);
        setRecentListings((listings || []) as (Listing & { projects: { name: string } | null })[]);

        const { data: redemptions } = await supabase
            .from("redemptions")
            .select("*, profiles(email)")
            .eq("status", "pending")
            .order("created_at", { ascending: false });
        setPendingRedemptions((redemptions || []) as (Redemption & { profiles: { email: string } | null })[]);

        setLoading(false);
    }, [router]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Realtime: all admin-relevant tables
    useRealtimeTable({
        table: "profiles",
        events: ["INSERT", "UPDATE"],
        onEvent: () => loadData(),
    });

    useRealtimeTable({
        table: "projects",
        events: ["INSERT", "UPDATE", "DELETE"],
        onEvent: () => loadData(),
    });

    useRealtimeTable({
        table: "listings",
        events: ["INSERT", "UPDATE", "DELETE"],
        onEvent: () => loadData(),
    });

    useRealtimeTable({
        table: "redemptions",
        events: ["INSERT", "UPDATE"],
        onEvent: () => loadData(),
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
                <div className="container mx-auto px-4 py-8">
                    <Skeleton className="mb-6 h-5 w-32" />
                    <Skeleton className="mb-8 h-10 w-48" />
                    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-yellow-50/50 via-white to-green-50/50">
            <div className="container mx-auto px-4 py-8">
                <Link
                    href="/projects"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to projects
                </Link>

                <h1 className="mb-8 text-3xl font-bold">Admin Dashboard</h1>

                {/* Stats */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-blue-100 p-3">
                                <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Users</p>
                                <p className="text-2xl font-bold">{userCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-green-100 p-3">
                                <FolderOpen className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Projects</p>
                                <p className="text-2xl font-bold">{projectCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-purple-100 p-3">
                                <ShoppingCart className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Listings</p>
                                <p className="text-2xl font-bold">{listingCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-yellow-100 p-3">
                                <DollarSign className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Pending Redemptions
                                </p>
                                <p className="text-2xl font-bold">{redemptionCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="users">
                    <TabsList className="mb-4">
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="projects">Projects</TabsTrigger>
                        <TabsTrigger value="listings">Listings</TabsTrigger>
                        <TabsTrigger value="redemptions">
                            Redemptions{" "}
                            {pendingRedemptions.length > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                    {pendingRedemptions.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Users</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Admin</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentUsers.map((u) => (
                                            <TableRow key={u.id}>
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>{u.pineapple_balance} 🍍</TableCell>
                                                <TableCell>
                                                    {u.is_admin ? (
                                                        <Badge className="bg-blue-100 text-blue-700">
                                                            Admin
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {new Date(u.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="projects">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Projects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Progress</TableHead>
                                            <TableHead>Valuation</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentProjects.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-medium">{p.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{p.status}</Badge>
                                                </TableCell>
                                                <TableCell>{p.progress_score}%</TableCell>
                                                <TableCell>
                                                    {p.valuation_low > 0 ? (
                                                        `$${p.valuation_low.toLocaleString()} – $${p.valuation_high.toLocaleString()}`
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {new Date(p.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="listings">
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Listings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {recentListings.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No listings yet
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Project</TableHead>
                                                <TableHead>Price Range</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Listed</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentListings.map((l) => (
                                                <TableRow key={l.id}>
                                                    <TableCell className="font-medium">
                                                        {l.title}
                                                    </TableCell>
                                                    <TableCell>
                                                        {l.projects?.name || "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        ${(l.asking_price_low ?? 0).toLocaleString()} – $
                                                        {(l.asking_price_high ?? 0).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{l.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {new Date(l.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="redemptions">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Redemptions</CardTitle>
                                <CardDescription>
                                    Review and fulfill pending pineapple redemptions
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingRedemptions.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No pending redemptions
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>User</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>Reward Type</TableHead>
                                                <TableHead>Requested</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingRedemptions.map((r) => (
                                                <TableRow key={r.id}>
                                                    <TableCell>
                                                        {r.profiles?.email || "Unknown"}
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {r.amount} 🍍
                                                    </TableCell>
                                                    <TableCell>
                                                        {r.reward_type === "uber_eats"
                                                            ? "Uber Eats Credit"
                                                            : r.reward_type}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className="bg-yellow-100 text-yellow-700"
                                                        >
                                                            Pending
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
