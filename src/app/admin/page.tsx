import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default async function AdminPage() {
    const supabase = createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile || !(profile as Profile).is_admin) {
        redirect("/projects");
    }

    // Load stats
    const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

    const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true });

    const { count: listingCount } = await supabase
        .from("listings")
        .select("*", { count: "exact", head: true });

    const { count: redemptionCount } = await supabase
        .from("redemptions")
        .select("*", { count: "exact", head: true });

    // Load recent data
    const { data: recentUsers } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

    const { data: recentProjects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

    const { data: recentListings } = await supabase
        .from("listings")
        .select("*, projects(name)")
        .order("created_at", { ascending: false })
        .limit(20);

    const { data: pendingRedemptions } = await supabase
        .from("redemptions")
        .select("*, profiles(email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    const typedUsers = (recentUsers || []) as Profile[];
    const typedProjects = (recentProjects || []) as Project[];
    const typedListings = (recentListings || []) as (Listing & {
        projects: { name: string } | null;
    })[];
    const typedRedemptions = (pendingRedemptions || []) as (Redemption & {
        profiles: { email: string } | null;
    })[];

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
                                <p className="text-2xl font-bold">{userCount || 0}</p>
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
                                <p className="text-2xl font-bold">{projectCount || 0}</p>
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
                                <p className="text-2xl font-bold">{listingCount || 0}</p>
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
                                <p className="text-2xl font-bold">{redemptionCount || 0}</p>
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
                            {typedRedemptions.length > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                    {typedRedemptions.length}
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
                                        {typedUsers.map((u) => (
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
                                        {typedProjects.map((p) => (
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
                                {typedListings.length === 0 ? (
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
                                            {typedListings.map((l) => (
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
                                {typedRedemptions.length === 0 ? (
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
                                            {typedRedemptions.map((r) => (
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
