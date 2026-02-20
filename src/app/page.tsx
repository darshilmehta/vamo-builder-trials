"use client";

import { useRef } from "react";
import Link from "next/link";
import {
    MessageSquare,
    Rocket,
    Store,
    TrendingUp,
    Sparkles,
    BarChart3,
    ArrowRight,
    Users,
    Target,
    Heart,
    ShieldCheck,
    Zap,
    Gift,
} from "lucide-react";

import { useI18n } from "@/components/I18nProvider";
import { Header } from "@/components/Header";
import { CursorSparkle } from "@/components/CursorSparkle";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
    const { t } = useI18n();
    const heroRef = useRef<HTMLDivElement>(null);

    const steps = [
        {
            num: "1",
            icon: Rocket,
            title: t("landing.step1Title"),
            desc: t("landing.step1Desc"),
        },
        {
            num: "2",
            icon: MessageSquare,
            title: t("landing.step2Title"),
            desc: t("landing.step2Desc"),
        },
        {
            num: "3",
            icon: Store,
            title: t("landing.step3Title"),
            desc: t("landing.step3Desc"),
        },
    ];

    const features = [
        { icon: MessageSquare, title: t("landing.feat1Title"), desc: t("landing.feat1Desc") },
        { icon: TrendingUp, title: t("landing.feat2Title"), desc: t("landing.feat2Desc") },
        { icon: Sparkles, title: t("landing.feat3Title"), desc: t("landing.feat3Desc") },
        { icon: Store, title: t("landing.feat4Title"), desc: t("landing.feat4Desc") },
        { icon: Gift, title: t("landing.feat5Title"), desc: t("landing.feat5Desc") },
        { icon: BarChart3, title: t("landing.feat6Title"), desc: t("landing.feat6Desc") },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header variant="public" />

            {/* ============ HERO — 100vh ============ */}
            <section
                ref={heroRef}
                className="relative flex h-[100vh] flex-col items-center justify-center overflow-hidden"
            >
                {/* Floating pineapple BG emojis */}
                <div className="absolute inset-0 -z-10 overflow-hidden select-none pointer-events-none" aria-hidden>
                    {[...Array(12)].map((_, i) => (
                        <span
                            key={i}
                            className="absolute animate-float text-4xl opacity-10 sm:text-5xl"
                            style={{
                                left: `${8 + (i * 7.5) % 85}%`,
                                top: `${10 + (i * 11.3) % 75}%`,
                                animationDelay: `${i * 0.4}s`,
                                animationDuration: `${6 + (i % 4)}s`,
                            }}
                        >
                            🍍
                        </span>
                    ))}
                </div>

                {/* Sparkle trail on cursor */}
                <CursorSparkle containerRef={heroRef} />

                {/* Content */}
                <div className="relative z-20 text-center px-4 max-w-4xl mx-auto">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground">
                        <span>🍍</span>
                        {t("landing.badge")}
                    </div>

                    <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl">
                        <span className="text-gradient-orange">Vamo</span>
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
                        {t("landing.heroDescription")}
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <Link href="/signup">
                            <Button size="lg" className="gradient-orange text-white border-0 gap-2 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow">
                                {t("landing.ctaStart")}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/marketplace">
                            <Button variant="outline" size="lg" className="gap-2 px-8 text-base">
                                <Store className="h-4 w-4" />
                                {t("landing.ctaBrowse")}
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Scroll hint */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
                    <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
                        <div className="h-2 w-1 rounded-full bg-muted-foreground/30 animate-pulse" />
                    </div>
                </div>
            </section>

            {/* ============ ABOUT US ============ */}
            <section id="about" className="py-24 border-t">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="grid gap-12 lg:grid-cols-2 items-center">
                        <div>
                            <h2 className="text-3xl font-bold sm:text-4xl">
                                About <span className="text-gradient-orange">Vamo</span>
                            </h2>
                            <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
                                Vamo was built for non-technical founders who want to take their startup from idea to traction — without needing a technical co-founder. We believe every founder deserves tools that help them track real progress, get fair valuations, and connect with the right buyers.
                            </p>
                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Target className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Our Mission</h3>
                                        <p className="text-sm text-muted-foreground">Democratize startup building by making it trackable, fundable, and rewarding.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Heart className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Our Values</h3>
                                        <p className="text-sm text-muted-foreground">Transparency, real progress over vanity metrics, and community-driven growth.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Trust & Safety</h3>
                                        <p className="text-sm text-muted-foreground">AI-verified progress logs ensure marketplace listings are backed by real data.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">Speed to Value</h3>
                                        <p className="text-sm text-muted-foreground">Go from idea to first valuation in minutes, not months.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="relative flex items-center justify-center">
                            <div className="grid grid-cols-3 gap-4 text-center">
                                {["🍍", "🚀", "💡", "📊", "🏆", "💰", "⚡", "🎯", "✨"].map((emoji, i) => (
                                    <div
                                        key={i}
                                        className="flex h-20 w-20 items-center justify-center rounded-2xl border bg-card text-3xl shadow-sm transition-all hover:scale-110 hover:shadow-lg hover:border-primary/40"
                                        style={{ animationDelay: `${i * 0.1}s` }}
                                    >
                                        {emoji}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ HOW IT WORKS ============ */}
            <section id="how-it-works" className="border-t bg-card py-24">
                <div className="mx-auto max-w-7xl px-4">
                    <h2 className="text-center text-3xl font-bold sm:text-4xl">
                        {t("landing.howItWorksTitle")}
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
                        From idea to funded startup in three simple steps
                    </p>
                    <div className="relative mt-16">
                        {/* Connecting line — desktop */}
                        <div className="absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 hidden md:block" />

                        <div className="grid gap-8 md:grid-cols-3">
                            {steps.map((step) => (
                                <div
                                    key={step.num}
                                    className="group relative rounded-2xl border bg-background p-8 text-center transition-all hover:border-primary/40 hover:shadow-lg"
                                >
                                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl gradient-orange text-white text-xl font-bold shadow-lg">
                                        {step.num}
                                    </div>
                                    <step.icon className="mx-auto mb-3 h-6 w-6 text-primary" />
                                    <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ MARKETPLACE SHOWCASE ============ */}
            <section id="marketplace" className="py-24 border-t">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="mx-auto max-w-3xl text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Store className="h-7 w-7" />
                        </div>
                        <h2 className="text-3xl font-bold sm:text-4xl">
                            The Startup Marketplace
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                            Every project on Vamo can be listed on our marketplace once it reaches verified traction. Browse real startups with AI-verified progress, transparent activity timelines, and fair valuations — or list your own project for sale.
                        </p>
                    </div>

                    <div className="mt-12 grid gap-6 sm:grid-cols-3">
                        <div className="rounded-2xl border bg-card p-6 text-center transition-all hover:border-primary/40 hover:shadow-lg">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold mb-2">For Buyers</h3>
                            <p className="text-sm text-muted-foreground">Discover startups with real, verified traction. See exactly what&apos;s been built before you make an offer.</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-6 text-center transition-all hover:border-primary/40 hover:shadow-lg">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold mb-2">AI Valuations</h3>
                            <p className="text-sm text-muted-foreground">Every listing includes an AI-generated valuation based on real progress signals, not hype.</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-6 text-center transition-all hover:border-primary/40 hover:shadow-lg">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Rocket className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold mb-2">For Founders</h3>
                            <p className="text-sm text-muted-foreground">List your project when you&apos;re ready. Your verified progress timeline builds buyer confidence.</p>
                        </div>
                    </div>

                    <div className="mt-10 text-center">
                        <Link href="/marketplace">
                            <Button size="lg" className="gradient-orange text-white border-0 gap-2 px-8 text-base font-semibold shadow-lg">
                                <Store className="h-4 w-4" />
                                Browse Marketplace
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ============ FEATURES GRID ============ */}
            <section className="py-24 border-t bg-card">
                <div className="mx-auto max-w-7xl px-4">
                    <h2 className="text-center text-3xl font-bold sm:text-4xl">
                        {t("landing.featuresTitle")}
                    </h2>
                    <div className="stagger-children mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feat) => (
                            <div
                                key={feat.title}
                                className="group rounded-2xl border bg-background p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                    <feat.icon className="h-5 w-5" />
                                </div>
                                <h3 className="mb-2 text-base font-semibold">{feat.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ CTA BANNER ============ */}
            <section className="py-24">
                <div className="mx-auto max-w-4xl px-4">
                    <div className="gradient-orange rounded-3xl p-10 text-center text-white sm:p-16">
                        <h2 className="text-3xl font-bold sm:text-4xl">
                            {t("landing.ctaBannerTitle")}
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                            {t("landing.ctaBannerDesc")}
                        </p>
                        <Link href="/signup">
                            <Button
                                size="lg"
                                className="mt-8 bg-white text-orange-600 hover:bg-white/90 gap-2 px-8 text-base font-semibold shadow-lg"
                            >
                                {t("landing.ctaBannerButton")}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ============ FOOTER ============ */}
            <footer className="border-t bg-card py-12">
                <div className="mx-auto max-w-7xl px-4">
                    <div className="grid gap-8 sm:grid-cols-3">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">🍍</span>
                                <span className="font-bold text-lg text-gradient-orange">Vamo</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Built for founders who ship. Track progress, earn rewards, and get your startup valued.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Product</h4>
                            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <a href="#about" className="hover:text-foreground transition-colors">About Us</a>
                                <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
                                <Link href="/marketplace" className="hover:text-foreground transition-colors">
                                    Marketplace
                                </Link>
                            </nav>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-3">Get Started</h4>
                            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                                <Link href="/login" className="hover:text-foreground transition-colors">
                                    {t("nav.signIn")}
                                </Link>
                                <Link href="/signup" className="hover:text-foreground transition-colors">
                                    {t("nav.signUp")}
                                </Link>
                            </nav>
                        </div>
                    </div>
                    <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
                        {t("landing.footerCopy")}
                    </div>
                </div>
            </footer>
        </div>
    );
}
