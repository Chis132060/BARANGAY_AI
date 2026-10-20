import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Barangay Tandang Sora — Admin Portal",
    template: "%s | Barangay Tandang Sora Admin",
  },
  description:
    "Admin portal for managing Barangay Tandang Sora operations, staff, residents, and community services.",
  icons: { icon: "/logo-icon.png", apple: "/logo-icon.png" },
  robots: { index: false, follow: false }, // Admin portals should not be indexed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
