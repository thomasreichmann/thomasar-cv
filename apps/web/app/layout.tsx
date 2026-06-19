import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { site } from "@/lib/site";
import { TRPCReactProvider } from "@/trpc/react";
import "./globals.css";

// Oxide identity (ADR 0004): Bricolage Grotesque is the sans (display + body),
// Geist Mono stays for the uppercase eyebrow labels.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: site.name,
  description: site.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <TRPCReactProvider>{children}</TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
