import type { Metadata } from "next";
import { Mitr, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
});

// Minimal/Pixel modes' rounder, warmer body font (specs/033-multi-theme-system
// research.md Decision 3) — Light/Dark keep the Noto Sans Thai above.
const mitr = Mitr({
  variable: "--font-mitr",
  weight: ["400", "500", "600"],
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "DG Warehouse 01 — Progress Tracker",
  description: "ติดตามความคืบหน้าการก่อสร้าง DG Warehouse 01 — รูปภาพและเอกสาร",
};

// Reads the stored theme choice and applies it to <html> before React
// hydrates, so the very first paint is already correct — no flash of a
// different mode's colors (specs/033-multi-theme-system spec Edge Cases).
// Deliberately a plain string, not a module import: this has to run
// synchronously and inline, before any app JS has loaded.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("dg-theme") || "minimal";
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${mitr.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
