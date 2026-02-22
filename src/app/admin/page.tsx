"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useRealtimeTable } from "@/lib/useRealtimeTable";
import { Header } from "@/components/Header";

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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    Users,
    FolderOpen,
    ShoppingCart,
    DollarSign,
    MessageSquare,
    Activity,
} from "lucide-react";
import type { Profile, Project, Listing, Redemption } from "@/lib/types";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

// Extend Profile with aggregated projects
type ProfileWithProjects = Profile & { projects: Project[] };

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [adminProfile, setAdminProfile] = useState<Profile | null>(null);
    
    const [userCount, setUserCount] = useState(0);
    const [projectCount, setProjectCount] = useState(0);
    const [listingCount, setListingCount] = useState(0);
    const [redemptionCount, setRedemptionCount] = useState(0);
    const [queryCount, setQueryCount] = useState(0);
    const [pineappleCount, setPineappleCount] = useState(0);
    
    const [recentUsers, setRecentUsers] = useState<ProfileWithProjects[]>([]);
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [recentListings, setRecentListings] = useState<(Listing & { projects: { name: string } | null })[]>([]);
    const [pendingRedemptions, setPendingRedemptions] = useState<(Redemption & { profiles: { email: string } | null })[]>([]);
    
    // Graph and analytics states
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState("all_time");
    const [graphData, setGraphData] = useState<Record<string, unknown>[]>([]);

    // User Modal state
    const [selectedUserForModal, setSelectedUserForModal] = useState<ProfileWithProjects | null>(null);

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
        setAdminProfile(profile as Profile);

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
        
        const { count: qc } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("role", "user");
        setQueryCount(qc || 0);
        
        const { data: rewards } = await supabase
            .from("reward_ledger")
            .select("reward_amount")
            .gt("reward_amount", 0)
            .limit(10000);
        const pineapplesGiven = (rewards || []).reduce((acc, curr) => acc + (curr.reward_amount || 0), 0);
        setPineappleCount(pineapplesGiven);

        // Load recent data
        const { data: users } = await supabase
            .from("profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);
            
        if (users && users.length > 0) {
            const { data: userProjects } = await supabase
                .from("projects")
                .select("*")
                .in("owner_id", users.map(u => u.id));
                
            const projectsByUser: Record<string, Project[]> = {};
            userProjects?.forEach(p => {
                if(!projectsByUser[p.owner_id]) projectsByUser[p.owner_id] = [];
                projectsByUser[p.owner_id].push(p as Project);
            });
            
            setRecentUsers(users.map(u => ({ ...u, projects: projectsByUser[u.id] || [] })) as ProfileWithProjects[]);
        } else {
            setRecentUsers([]);
        }

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

    const fetchGraphData = useCallback(async (metric: string, filter: string) => {
        const supabase = getSupabaseBrowserClient();
        
        let dateFilter = new Date();
        
        // Setup Date Filtering
        if (filter === "today") dateFilter.setDate(dateFilter.getDate() - 1);
        else if (filter === "this_week") dateFilter.setDate(dateFilter.getDate() - 7);
        else if (filter === "last_week") dateFilter.setDate(dateFilter.getDate() - 14);
        else if (filter === "this_month") dateFilter.setMonth(dateFilter.getMonth() - 1);
        else if (filter === "last_quarter") dateFilter.setMonth(dateFilter.getMonth() - 3);
        else if (filter === "last_year") dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        else dateFilter = new Date(0); // all_time

        let query;

        if (metric === "users") {
            query = supabase.from("profiles").select("created_at").gte("created_at", dateFilter.toISOString());
        } else if (metric === "projects") {
            query = supabase.from("projects").select("created_at").gte("created_at", dateFilter.toISOString());
        } else if (metric === "listings") {
            query = supabase.from("listings").select("created_at").gte("created_at", dateFilter.toISOString());
        } else if (metric === "queries") {
            query = supabase.from("messages").select("created_at").eq("role", "user").gte("created_at", dateFilter.toISOString());
        } else if (metric === "pineapples") {
            query = supabase.from("reward_ledger").select("created_at, reward_amount").gt("reward_amount", 0).gte("created_at", dateFilter.toISOString());
        }

        if(!query) return;

        // Note: For large amounts of data, server-side aggregations (RPCs) are optimal.
        // Doing this client-side for immediate insights, depending on table limits.
        const { data } = await query.limit(5000);
        if (!data) {
             setGraphData([]);
             return;
        }

        // Group by date
        const grouped: Record<string, number> = {};
        data.forEach((item: { created_at: string; reward_amount?: number }) => {
            const d = new Date(item.created_at);
            const key = filter === "today" 
                ? `${d.getHours()}:00` 
                : d.toISOString().split('T')[0];
            
            if (metric === "pineapples") {
                 grouped[key] = (grouped[key] || 0) + (item.reward_amount || 0);
            } else {
                 grouped[key] = (grouped[key] || 0) + 1;
            }
        });

        // Convert to array and sort by date key
        const sorted = Object.keys(grouped).sort().map(k => ({ date: k, value: grouped[k] }));
        setGraphData(sorted);
    }, []);

    useEffect(() => {
        if (selectedMetric) {
            fetchGraphData(selectedMetric, timeFilter);
        }
    }, [selectedMetric, timeFilter, fetchGraphData]);

    const markRedemptionFulfilled = async (id: string) => {
        const supabase = getSupabaseBrowserClient();
        await supabase
            .from("redemptions")
            .update({ status: "fulfilled", fulfilled_at: new Date().toISOString() })
            .eq("id", id);
        
        loadData();
    };

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
            <div className="min-h-screen bg-background text-foreground flex flex-col">
                <Header variant="authenticated" profile={adminProfile} />
                <main className="flex-1 container mx-auto px-4 py-8">
                    <Skeleton className="mb-6 h-5 w-32" />
                    <Skeleton className="mb-8 h-10 w-48" />
                    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header variant="authenticated" profile={adminProfile} />
            <main className="flex-1 container mx-auto px-4 py-8">
                <Link
                    href="/projects"
                    className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to projects
                </Link>

                <h1 className="mb-8 text-3xl font-bold">Admin Dashboard</h1>

                {/* Stats */}
                <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <Card 
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedMetric === "users" ? "border-primary" : ""}`}
                        onClick={() => setSelectedMetric("users")}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-primary/10 p-3">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Users</p>
                                <p className="text-2xl font-bold">{userCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedMetric === "projects" ? "border-accent" : ""}`}
                        onClick={() => setSelectedMetric("projects")}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-accent/10 p-3">
                                <FolderOpen className="h-6 w-6 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Projects</p>
                                <p className="text-2xl font-bold">{projectCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedMetric === "listings" ? "border-purple-600" : ""}`}
                        onClick={() => setSelectedMetric("listings")}
                    >
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
                    <Card
                        className="cursor-pointer transition-all hover:shadow-md"
                        onClick={() => {
                             setSelectedMetric(null);
                             const tabs = document.querySelector('[role="tablist"] [value="redemptions"]') as HTMLElement;
                             if (tabs) tabs.click();
                        }}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-yellow-100 p-3">
                                <DollarSign className="h-6 w-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Redemptions
                                </p>
                                <p className="text-2xl font-bold">{redemptionCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedMetric === "queries" ? "border-blue-600" : ""}`}
                        onClick={() => setSelectedMetric("queries")}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-blue-100 p-3">
                                <MessageSquare className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Queries</p>
                                <p className="text-2xl font-bold">{queryCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card
                        className={`cursor-pointer transition-all hover:shadow-md ${selectedMetric === "pineapples" ? "border-orange-500" : ""}`}
                        onClick={() => setSelectedMetric("pineapples")}
                    >
                        <CardContent className="flex items-center gap-4 p-6">
                            <div className="rounded-lg bg-orange-100 p-3">
                                <Activity className="h-6 w-6 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pineapples Given</p>
                                <p className="text-2xl font-bold">{pineappleCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Analytics Graph Modal/Section */}
                {selectedMetric && (
                    <Card className="mb-8 border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div>
                                <CardTitle className="capitalize">{selectedMetric} Analytics</CardTitle>
                                <CardDescription>Trends vs time based on selected filter</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <select 
                                    className="rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={timeFilter}
                                    onChange={(e) => setTimeFilter(e.target.value)}
                                >
                                    <option value="today">Today</option>
                                    <option value="this_week">This Week</option>
                                    <option value="last_week">Last Week</option>
                                    <option value="this_month">This Month</option>
                                    <option value="last_quarter">Last Quarter</option>
                                    <option value="last_year">Last Year</option>
                                    <option value="all_time">All Time</option>
                                </select>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedMetric(null)}>Close</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full pt-4">
                                {graphData.length === 0 ? (
                                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                        No data available for this timeframe
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={graphData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis 
                                                dataKey="date" 
                                                axisLine={false}
                                                tickLine={false}
                                                tickMargin={10}
                                                tick={{ fill: "currentColor", fontSize: 12 }}
                                                opacity={0.5}
                                            />
                                            <YAxis 
                                                axisLine={false}
                                                tickLine={false}
                                                tickMargin={10}
                                                tick={{ fill: "currentColor", fontSize: 12 }}
                                                opacity={0.5}
                                            />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: "8px", border: "1px solid rgba(0,0,0,0.1)" }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="value" 
                                                stroke="hsl(var(--primary))" 
                                                strokeWidth={3} 
                                                dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }} 
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

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
                                <CardDescription>Click on a user row to see detailed insights and websites.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Balance</TableHead>
                                            <TableHead>Websites</TableHead>
                                            <TableHead>Admin</TableHead>
                                            <TableHead>Joined</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentUsers.map((u) => (
                                            <TableRow 
                                                key={u.id} 
                                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                onClick={() => setSelectedUserForModal(u)}
                                            >
                                                <TableCell>{u.email}</TableCell>
                                                <TableCell>{u.pineapple_balance} 🍍</TableCell>
                                                <TableCell>{u.projects?.length || 0}</TableCell>
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
                                    Review and fulfill pending pineapple redemptions (e.g., uber_credits)
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
                                                <TableHead>Action</TableHead>
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
                                                        {r.reward_type === "uber_eats" || r.reward_type === "uber_credits"
                                                            ? "Uber Eats Credit"
                                                            : r.reward_type}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {new Date(r.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button 
                                                            size="sm" 
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 markRedemptionFulfilled(r.id);
                                                            }}
                                                        >
                                                            Mark Fulfilled
                                                        </Button>
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
                
                {/* User Detail Modal */}
                <Dialog open={!!selectedUserForModal} onOpenChange={(open) => !open && setSelectedUserForModal(null)}>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{selectedUserForModal?.email}&apos;s Profile Details</DialogTitle>
                        </DialogHeader>
                        {selectedUserForModal && (
                            <div className="space-y-6 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                     <Card className="bg-primary/5 border-primary/20">
                                         <CardContent className="p-4 flex flex-col items-center justify-center">
                                             <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Current Balance</p>
                                             <p className="text-4xl font-bold mt-2 text-primary">{selectedUserForModal.pineapple_balance} 🍍</p>
                                         </CardContent>
                                     </Card>
                                     <Card className="bg-accent/5 border-accent/20">
                                         <CardContent className="p-4 flex flex-col items-center justify-center">
                                             <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Websites</p>
                                             <p className="text-4xl font-bold mt-2 text-accent">{selectedUserForModal.projects?.length || 0}</p>
                                         </CardContent>
                                     </Card>
                                </div>
                                
                                <div>
                                    <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                                        <FolderOpen className="h-5 w-5" />
                                        User&apos;s Websites & Progress
                                    </h3>
                                    {!selectedUserForModal.projects || selectedUserForModal.projects.length === 0 ? (
                                        <div className="text-sm text-muted-foreground py-8 text-center bg-muted/20 rounded-lg">
                                            This user has no projects yet.
                                        </div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Website Name</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Progress</TableHead>
                                                    <TableHead className="text-right">Valuation Est.</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedUserForModal.projects.map((p) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="font-medium">{p.name || "Unnamed Project"}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={p.status === "active" ? "default" : "secondary"}>
                                                                {p.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-full bg-muted rounded-full h-2 min-w-[50px] relative overflow-hidden">
                                                                    <div 
                                                                        className="absolute top-0 left-0 h-full bg-primary" 
                                                                        style={{ width: `${p.progress_score}%` }} 
                                                                    />
                                                                </div>
                                                                <span className="text-xs font-semibold">{p.progress_score}%</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right text-muted-foreground">
                                                             {p.valuation_low > 0 ? `$${p.valuation_low.toLocaleString()}` : "—"}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </main>
            
            {/* Footer */}
            <footer className="mt-auto border-t bg-card py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <p className="mb-2 font-semibold text-base">Vamo Admin Panel</p>
                    <p>Manage users, verify projects, review analytics, and fulfill pending redemptions securely.</p>
                </div>
            </footer>
        </div>
    );
}
