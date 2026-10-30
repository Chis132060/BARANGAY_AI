import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ServiceWorkerCleanup } from "@/components/sw-killer";

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
  icons: { icon: "/logo.png", apple: "/logo.png" },
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
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body suppressHydrationWarning>
        <ServiceWorkerCleanup />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

