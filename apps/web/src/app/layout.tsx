import type { Metadata } from 'next';
import './globals.css';
import DemoModeBadge from '@/components/Demo/DemoModeBadge';
import CommonLayout from '@/components/Common/Layout';

export const metadata: Metadata = {
  title: 'CivicFlow - Institutional Demo Mode',
  description:
    'CivicFlow keeps lenders oriented with demo-first SBA 504 and 7a workflows that run even when core systems are down.',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: 'var(--cc-bg)', color: 'var(--cc-text)' }}>
        <DemoModeBadge />
        <CommonLayout>{children}</CommonLayout>
      </body>
    </html>
  );
}

