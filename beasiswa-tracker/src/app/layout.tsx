import type { Metadata } from 'next';
import { ToastProvider } from '@/components/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Beasiswa Tracker',
  description: 'Lacak pengeluaran uang saku beasiswamu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
