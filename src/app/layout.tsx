import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'SplitSmart AI — Group Trip Expense Splitter',
  description: 'Every trip. Every expense. Perfectly split. AI-powered group travel expense management, debt minimization, and smart financial insights.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
