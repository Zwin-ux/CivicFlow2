import type { Metadata } from "next";
import "./globals.css";
import DemoModeBadge from "@/components/Demo/DemoModeBadge";
import CommonLayout from "@/components/Common/Layout";

export const metadata: Metadata = {
  title: "CivicFlow — Institutional Lending Workflows",
  description: "Fast, clear, auditable government lending platform for microbusiness and SBA-style lenders",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <DemoModeBadge />
        <CommonLayout>
          {children}
        </CommonLayout>
      </body>
    </html>
  );
}
