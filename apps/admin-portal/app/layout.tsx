import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Smart Barangay — Admin Portal",
    template: "%s | Smart Barangay Admin",
  },
  description:
    "Admin portal for managing Smart Barangay operations, staff, residents, and AI-powered services.",
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
