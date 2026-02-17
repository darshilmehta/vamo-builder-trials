import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NavigationLoader } from "@/components/NavigationLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Vamo — Build & Track Your Startup",
  description:
    "Vamo is a builder where non-technical founders iterate on their startup UI and business progress in parallel. Earn pineapples, track traction, get instant offers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavigationLoader />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
