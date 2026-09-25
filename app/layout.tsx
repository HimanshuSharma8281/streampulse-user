import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/userContext';

export const metadata: Metadata = {
  title: 'StreamPulse — Watch Live Streams',
  description: 'Ultra-low latency live screen broadcasting and real-time interactive community chat.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090a0f] text-slate-100 min-h-screen flex flex-col antialiased selection:bg-rose-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
