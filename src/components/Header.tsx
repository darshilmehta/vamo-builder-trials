"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useI18n } from "@/components/I18nProvider";
import { useFontSize } from "@/components/FontSizeProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Sun,
    Moon,
    Contrast,
    Globe,
    Menu,
    X,
    ChevronDown,
    LogOut,
    Minus,
    Plus,
    Home,
    FolderOpen,
    Store,
    Wallet,
    User,
} from "lucide-react";
import type { Profile } from "@/lib/types";

type HeaderProps = {
    variant?: "public" | "authenticated" | "builder";
    profile?: Profile | null;
    showBack?: boolean;
    backHref?: string;
    /** Render slot for right-side actions (used by builder) */
    actions?: React.ReactNode;
};

export function Header({
    variant = "public",
    profile: profileProp,
    showBack = false,
    backHref = "/projects",
    actions,
}: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const { locale, setLocale, t, locales } = useI18n();
    const { level, increase, decrease } = useFontSize();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Auto-detect auth state for "public" variant (landing page, marketplace)
    const [autoProfile, setAutoProfile] = useState<Profile | null>(null);
    const [authChecked, setAuthChecked] = useState(variant !== "public");

    useEffect(() => {
        if (variant !== "public") return;
        const supabase = getSupabaseBrowserClient();

        // Fast path: getSession() reads from local storage/cookie — no network round-trip.
        // Only call getUser() (network) if we already have a session token to validate.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setAuthChecked(true);
                return;
            }
            // Session exists — fetch profile (one network call instead of two)
            supabase
                .from("profiles")
                .select("*")
                .eq("id", session.user.id)
                .single()
                .then(({ data }) => {
                    if (data) setAutoProfile(data as Profile);
                    setAuthChecked(true);
                });
        });
    }, [variant]);


    // Use the passed profile or auto-detected one
    const profile = profileProp ?? autoProfile;
    const isSignedIn = variant !== "public" || !!autoProfile;

    // Determine effective variant for nav links
    const effectiveVariant = variant === "public" && isSignedIn ? "authenticated" : variant;

    const handleSignOut = useCallback(async () => {
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        setAutoProfile(null);
        router.push("/");
        router.refresh();
    }, [router]);

    const themeIcon =
        theme === "dark" ? (
            <Moon className="h-4 w-4" />
        ) : theme === "high-contrast" ? (
            <Contrast className="h-4 w-4" />
        ) : (
            <Sun className="h-4 w-4" />
        );

    const currentLocaleName = locales.find((l) => l.code === locale)?.label || "English";

    // Helper to check active path
    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    const navLinkClass = (href: string) =>
        `text-sm relative transition-colors ${isActive(href)
            ? "text-primary font-semibold after:absolute after:bottom-0 after:left-1 after:right-1 after:h-0.5 after:rounded-full after:bg-primary"
            : "text-muted-foreground hover:text-foreground"
        }`;

    const mobileNavLinkClass = (href: string) =>
        `w-full justify-start ${isActive(href)
            ? "bg-primary/10 text-primary font-medium border-l-2 border-primary"
            : ""
        }`;

    // Nav links based on effective variant
    const authNavLinks = [
        { href: "/", label: t("nav.home"), icon: Home },
        { href: "/projects", label: t("nav.projects"), icon: FolderOpen },
        { href: "/marketplace", label: t("nav.marketplace"), icon: Store },
        { href: "/wallet", label: t("nav.wallet"), icon: Wallet },
    ];

    const publicNavLinks = [
        { href: "/", label: t("nav.home"), icon: Home },
        { href: "/marketplace", label: t("nav.marketplace"), icon: Store },
    ];

    const navLinks = effectiveVariant === "public" ? publicNavLinks : authNavLinks;

    return (
        <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
                {/* Left: Logo + Nav */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-xl">🍍</span>
                        <span className="text-lg font-bold text-gradient-orange">Vamo</span>
                    </Link>

                    {/* Desktop nav links */}
                    <nav className="ml-2 hidden items-center gap-1 md:flex">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href}>
                                <Button variant="ghost" size="sm" className={navLinkClass(link.href)}>
                                    {link.label}
                                </Button>
                            </Link>
                        ))}
                        {isSignedIn && profile?.is_admin && (
                            <Link href="/admin">
                                <Button variant="ghost" size="sm" className={navLinkClass("/admin")}>
                                    {t("nav.admin")}
                                </Button>
                            </Link>
                        )}
                    </nav>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-1.5">
                    {/* Font size — desktop only */}
                    <div className="hidden items-center gap-0.5 rounded-full border bg-secondary/50 px-1.5 py-0.5 md:flex">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={decrease}
                            disabled={level === 0}
                            title={t("accessibility.decreaseFont")}
                        >
                            <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-xs font-medium text-muted-foreground px-0.5">A</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={increase}
                            disabled={level === 2}
                            title={t("accessibility.increaseFont")}
                        >
                            <Plus className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Language — desktop */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="hidden gap-1 md:inline-flex"
                            >
                                <Globe className="h-3.5 w-3.5" />
                                {currentLocaleName}
                                <ChevronDown className="h-3 w-3 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {locales.map((l) => (
                                <DropdownMenuItem
                                    key={l.code}
                                    onClick={() => setLocale(l.code)}
                                >
                                    {l.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Theme — desktop */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hidden md:flex">
                                {themeIcon}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTheme("light")}>
                                <Sun className="mr-2 h-4 w-4" />
                                {t("theme.light")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTheme("dark")}>
                                <Moon className="mr-2 h-4 w-4" />
                                {t("theme.dark")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setTheme("high-contrast")}>
                                <Contrast className="mr-2 h-4 w-4" />
                                {t("theme.highContrast")}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Auth actions / action slot */}
                    {actions}

                    {isSignedIn && authChecked ? (
                        <>
                            {/* Pineapple balance badge */}
                            <Link href="/wallet">
                                <Badge
                                    variant="outline"
                                    className="cursor-pointer gap-1 px-2.5 py-1 text-sm hover:bg-muted transition-colors"
                                >
                                    🍍 {profile?.pineapple_balance ?? 0}
                                </Badge>
                            </Link>

                            {/* Profile dropdown — desktop */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="hidden gap-1.5 md:inline-flex">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <User className="h-3.5 w-3.5" />
                                        </div>
                                        <span className="text-sm max-w-[120px] truncate">
                                            {profile?.full_name || profile?.email?.split("@")[0] || "Profile"}
                                        </span>
                                        <ChevronDown className="h-3 w-3 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64">
                                    <div className="px-3 py-2">
                                        <p className="text-sm font-medium">
                                            {profile?.full_name || "Vamo User"}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {profile?.email}
                                        </p>
                                    </div>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile" className="cursor-pointer">
                                            <User className="mr-2 h-4 w-4" />
                                            Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/wallet" className="cursor-pointer">
                                            <Wallet className="mr-2 h-4 w-4" />
                                            Wallet
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                🍍 {profile?.pineapple_balance ?? 0}
                                            </Badge>
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={handleSignOut}
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        {t("nav.signOut")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : authChecked ? (
                        <div className="hidden items-center gap-2 md:flex">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">
                                    {t("nav.signIn")}
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm" className="gradient-orange text-white border-0">
                                    {t("nav.signUp")}
                                </Button>
                            </Link>
                        </div>
                    ) : null}

                    {/* Mobile hamburger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 md:hidden"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                    </Button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="border-t bg-background px-4 py-3 md:hidden animate-fade-in-up">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                                <Button variant="ghost" className={mobileNavLinkClass(link.href)}>
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.label}
                                </Button>
                            </Link>
                        ))}
                        {isSignedIn && profile?.is_admin && (
                            <Link href="/admin" onClick={() => setMobileOpen(false)}>
                                <Button variant="ghost" className={mobileNavLinkClass("/admin")}>
                                    {t("nav.admin")}
                                </Button>
                            </Link>
                        )}
                        {isSignedIn && authChecked ? (
                            <>
                                <Link href="/profile" onClick={() => setMobileOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <User className="mr-2 h-4 w-4" />
                                        Profile
                                    </Button>
                                </Link>
                                <Link href="/wallet" onClick={() => setMobileOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        <Wallet className="mr-2 h-4 w-4" />
                                        Wallet — 🍍 {profile?.pineapple_balance ?? 0}
                                    </Button>
                                </Link>
                            </>
                        ) : authChecked ? (
                            <>
                                <Link href="/login" onClick={() => setMobileOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">
                                        {t("nav.signIn")}
                                    </Button>
                                </Link>
                                <Link href="/signup" onClick={() => setMobileOpen(false)}>
                                    <Button className="w-full gradient-orange text-white border-0">
                                        {t("nav.signUp")}
                                    </Button>
                                </Link>
                            </>
                        ) : null}
                    </nav>

                    {/* Mobile controls row */}
                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                        {/* Language */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1">
                                    <Globe className="h-3.5 w-3.5" />
                                    {currentLocaleName}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {locales.map((l) => (
                                    <DropdownMenuItem
                                        key={l.code}
                                        onClick={() => setLocale(l.code)}
                                    >
                                        {l.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Font size */}
                        <div className="flex items-center gap-1 rounded-full border px-2 py-0.5">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={decrease} disabled={level === 0}>
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs px-1">A</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={increase} disabled={level === 2}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>

                        {isSignedIn && authChecked && (
                            <Button variant="outline" size="sm" onClick={handleSignOut}>
                                <LogOut className="mr-1 h-3.5 w-3.5" />
                                {t("nav.signOut")}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
