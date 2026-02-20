"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    User,
    Mail,
    Calendar,
    Wallet,
    ArrowRight,
    LogOut,
} from "lucide-react";

import { useI18n } from "@/components/I18nProvider";
import { Header } from "@/components/Header";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/types";

export default function ProfilePage() {
    const { t } = useI18n();
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = getSupabaseBrowserClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) {
                router.push("/login");
                return;
            }
            supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()
                .then(({ data }) => {
                    if (data) setProfile(data as Profile);
                    setLoading(false);
                });
        });
    }, [router]);

    const handleSignOut = async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    if (loading) {
        return (
            <div className="flex h-screen flex-col bg-background">
                <Header variant="authenticated" />
                <div className="flex flex-1 items-center justify-center">
                    <div className="animate-pulse text-muted-foreground">Loading profile…</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header variant="authenticated" profile={profile} />

            <main className="mx-auto max-w-2xl px-4 py-12">
                <h1 className="text-3xl font-bold mb-8">Profile</h1>

                {/* Profile Info Card */}
                <Card className="mb-6 border-primary/10 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                {profile?.avatar_url ? (
                                    <img
                                        src={profile.avatar_url}
                                        alt="Avatar"
                                        className="h-16 w-16 rounded-full object-cover"
                                    />
                                ) : (
                                    <User className="h-8 w-8" />
                                )}
                            </div>
                            <div>
                                <CardTitle className="text-xl">
                                    {profile?.full_name || "Vamo User"}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1.5 mt-1">
                                    <Mail className="h-3.5 w-3.5" />
                                    {profile?.email}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="flex items-center gap-3 rounded-xl border p-4">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Joined</p>
                                    <p className="text-sm font-medium">
                                        {profile?.created_at
                                            ? new Date(profile.created_at).toLocaleDateString(undefined, {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                              })
                                            : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl border p-4">
                                <span className="text-xl">🍍</span>
                                <div>
                                    <p className="text-xs text-muted-foreground">Pineapple Balance</p>
                                    <p className="text-sm font-bold text-gradient-orange">
                                        {profile?.pineapple_balance ?? 0} pineapples
                                    </p>
                                </div>
                            </div>
                        </div>

                        {profile?.is_admin && (
                            <Badge className="mt-4 gradient-orange text-white border-0">
                                Admin
                            </Badge>
                        )}
                    </CardContent>
                </Card>

                {/* Wallet Quick Access */}
                <Card className="mb-6 border-primary/10 shadow-sm">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold">Wallet</h3>
                                    <p className="text-sm text-muted-foreground">
                                        View your pineapple rewards, transactions, and redemption history
                                    </p>
                                </div>
                            </div>
                            <Link href="/wallet">
                                <Button variant="outline" size="sm" className="gap-1">
                                    Open
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Sign Out */}
                <Button
                    variant="outline"
                    className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleSignOut}
                >
                    <LogOut className="h-4 w-4" />
                    {t("nav.signOut")}
                </Button>
            </main>
        </div>
    );
}
