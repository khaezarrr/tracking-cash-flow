'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Receipt, FileText, Settings, LogOut, BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  user: { email?: string };
  profile: { full_name: string | null; university: string | null } | null;
}

const navItems = [
  { href: '/dashboard',           label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/dashboard/expenses',  label: 'Pengeluaran',  icon: Receipt },
  { href: '/dashboard/reports',   label: 'Laporan',      icon: FileText },
  { href: '/dashboard/settings',  label: 'Pengaturan',   icon: Settings },
];

export default function Sidebar({ user, profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">Beasiswa Tracker</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1" aria-label="Navigasi utama">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile?.full_name ?? user.email}
          </p>
          {profile?.university && (
            <p className="text-xs text-gray-500 truncate">{profile.university}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-gray-600
                     hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
          aria-label="Keluar dari akun"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-100 z-30">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-100 z-30 flex items-center px-4 gap-3">
        <button onClick={() => setMobileOpen(true)} aria-label="Buka menu navigasi" className="p-1">
          <Menu className="w-5 h-5 text-gray-600" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-brand-600 rounded flex items-center justify-center" aria-hidden="true">
            <BookOpen className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">Beasiswa Tracker</span>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative w-64 bg-white h-full shadow-xl flex flex-col" aria-label="Menu navigasi">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
              className="absolute top-4 right-4 p-1"
            >
              <X className="w-5 h-5 text-gray-400" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
