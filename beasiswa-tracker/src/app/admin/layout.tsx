import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ToastProvider } from '@/components/Toast';
import { ShieldCheck, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';

// Defense in depth — middleware adalah garis pertama, layout ini garis kedua.
// Kalau middleware bypass karena edge case, layout ini tetap block.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single();

  // Double-check: hanya admin yang boleh masuk
  if (profile?.role !== 'admin') redirect('/dashboard');

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">

        {/* Admin top bar — sengaja berbeda dari sidebar user biasa */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">

              <div className="flex items-center gap-3">
                <div
                  className="w-7 h-7 bg-red-600 rounded-md flex items-center justify-center"
                  aria-hidden="true"
                >
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900 text-sm">Admin Panel</span>
                <span className="text-gray-300 text-sm" aria-hidden="true">·</span>
                <span className="text-gray-500 text-sm">Beasiswa Tracker</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-400 hidden sm:block">
                  {profile?.full_name ?? user.email}
                </span>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-500
                             hover:text-gray-900 transition-colors"
                  aria-label="Kembali ke dashboard user"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
                  Dashboard
                </Link>
              </div>

            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

      </div>
    </ToastProvider>
  );
}
