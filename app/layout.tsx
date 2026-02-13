import type { Metadata } from "next";
import { TopNav } from "@/components/layout/TopNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Enterprise Document Architecture Lab",
  description: "Custom render-first engine vs Nutrient SDK in one Next.js system"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <TopNav />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
