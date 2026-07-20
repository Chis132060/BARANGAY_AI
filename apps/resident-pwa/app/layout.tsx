import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SwKiller } from "@/components/sw-killer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Smart Barangay",
    template: "%s | Smart Barangay",
  },
  description:
    "Your digital barangay — request documents, receive announcements, and chat with AI-powered support.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart Barangay",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "Smart Barangay",
    title: "Smart Barangay",
    description: "Your digital barangay portal.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <SwKiller />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

