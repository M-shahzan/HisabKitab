import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hisab Kitab | AI Voice Billing & Inventory for Indian Retail",
  description:
    "Voice-first intelligent billing and inventory management application designed for local grocery shops and kirana stores in India.",
  keywords: ["Voice Billing", "Kirana POS", "Inventory Management", "Indian Retail", "Hisab Kitab"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#065F46",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-retail-bg antialiased font-sans">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
