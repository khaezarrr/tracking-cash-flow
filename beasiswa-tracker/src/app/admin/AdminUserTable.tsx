'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { formatRupiah, formatDateShort } from '@/lib/utils';
import type { UserSummary } from '@/lib/types';

interface Props {
  users: UserSummary[];
}

export default function AdminUserTable({ users }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.university?.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="space-y-4">

      {/* Search bar */}
      <div className="relative w-full sm:w-80">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Cari nama atau universitas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input pl-9 w-full"
          aria-label="Cari user berdasarkan nama atau universitas"
        />
      </div>

      {/* Result count — hanya tampil saat ada search query */}
      {search.trim() && (
        <p className="text-sm text-gray-500" aria-live="polite">
          {filtered.length} dari {users.length} user
        </p>
      )}

      {/* Empty states */}
      {filtered.length === 0 && (
        <div className="card p-10 text-center text-gray-400" role="status">
          {search.trim()
            ? 'Tidak ada user yang cocok dengan pencarian.'
            : 'Belum ada user terdaftar.'}
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <Th align="left">Nama</Th>
                <Th align="left">Universitas</Th>
                <Th align="right">Budget Aktif</Th>
                <Th align="right">Mulai Budget</Th>
                <Th align="right">Total Pengeluaran</Th>
                <Th align="right">Saldo Tersisa</Th>
                <th className="px-4 py-3" aria-label="Aksi" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.user_id} className="hover:bg-gray-50 transition-colors">

                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {u.full_name ?? <Dash />}
                  </td>

                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {u.university ?? <Dash />}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                    {u.budget_amount != null
                      ? formatRupiah(u.budget_amount)
                      : <Dash />}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">
                    {u.budget_start
                      ? formatDateShort(u.budget_start)
                      : <Dash />}
                  </td>

                  <td className="px-4 py-3 text-right text-gray-900 whitespace-nowrap">
                    {u.total_expenses != null
                      ? formatRupiah(u.total_expenses)
                      : <Dash />}
                  </td>

                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {u.remaining != null ? (
                      <span className={
                        u.remaining < 0
                          ? 'text-red-600 font-medium'
                          : 'text-green-600'
                      }>
                        {formatRupiah(u.remaining)}
                      </span>
                    ) : (
                      <Dash />
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.user_id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium
                                 text-brand-600 hover:text-brand-700 transition-colors"
                      aria-label={`Lihat detail ${u.full_name ?? 'user'}`}
                    >
                      Lihat Detail
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

// ─── Local sub-components ─────────────────────────────────────────────────────

function Th({ children, align }: { children: React.ReactNode; align: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase tracking-wide`}>
      {children}
    </th>
  );
}

function Dash() {
  return <span className="text-gray-300" aria-label="tidak ada data">—</span>;
}
