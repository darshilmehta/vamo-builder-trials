import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, DollarSign } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-green-50">
      {/* Nav */}
      <header className="border-b bg-white/60 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Image
              src="/vamo_logo.png"
              alt="Vamo Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="text-xl font-bold">Vamo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/marketplace">
              <Button variant="ghost" size="sm">
                Marketplace
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-1.5 text-sm font-medium shadow-sm">
            <span className="text-lg">🍍</span>
            Earn pineapples for real progress
          </div>
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">
            Build Your Startup.
            <br />
            <span className="bg-gradient-to-r from-yellow-500 to-green-500 bg-clip-text text-transparent">
              Track What Matters.
            </span>
          </h1>
          <p className="mb-8 text-xl text-muted-foreground">
            Vamo is where non-technical founders iterate on their product and
            business in parallel. Chat with AI, track traction, earn rewards,
            and get instant valuations.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="gap-2 text-lg px-8">
                Start Building
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg" className="text-lg px-8">
                Browse Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <Sparkles className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">AI Co-Pilot</h3>
            <p className="text-muted-foreground">
              Chat with Vamo AI to log progress, ship features, and get
              intelligent business analysis in real-time.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Traction Tracking</h3>
            <p className="text-muted-foreground">
              Every feature shipped, customer added, and revenue logged builds
              your progress score and traction signals.
            </p>
          </div>
          <div className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Instant Offers</h3>
            <p className="text-muted-foreground">
              Get AI-generated valuations based on your logged progress. List
              your project for sale on the marketplace.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/60">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Vamo. Built for founders who ship.</p>
        </div>
      </footer>
    </div>
  );
}
