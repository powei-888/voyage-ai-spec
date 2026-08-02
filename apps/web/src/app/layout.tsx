import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Voyage AI", template: "%s | Voyage AI" },
  description: "AI 原生旅程協作工作區"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
