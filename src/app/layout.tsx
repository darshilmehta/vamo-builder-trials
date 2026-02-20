import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NavigationLoader } from "@/components/NavigationLoader";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";
import { FontSizeProvider } from "@/components/FontSizeProvider";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",   // show system font immediately; swap to Inter when loaded (no FOIT)
    preload: true,
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: "Vamo — Build, Track & Earn for Your Startup",
    description:
        "Vamo is where non-technical founders build their startup, track real traction, earn pineapple rewards, and get instant AI-generated valuations.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Allow the browser to open connections to font + data hosts before they are requested */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href={process.env.VITE_SUPABASE_URL ?? "https://supabase.co"} />
            </head>
            <body className={inter.className}>
                <ThemeProvider>
                    <I18nProvider>
                        <FontSizeProvider>
                            <TooltipProvider delayDuration={300}>
                                <NavigationLoader />
                                {children}
                                <Toaster richColors position="top-right" />
                            </TooltipProvider>
                        </FontSizeProvider>
                    </I18nProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}

