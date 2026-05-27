'use client';

import { Search } from 'lucide-react';
import { CATEGORIES, type Category } from '@/lib/types';

interface Props {
  search: string;
  filterCat: Category | 'Semua';
  onSearchChange: (val: string) => void;
  onCategoryChange: (cat: Category | 'Semua') => void;
}

export default function ExpenseFilters({ search, filterCat, onSearchChange, onCategoryChange }: Props) {
  return (
    <div className="card p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
        <input
          type="search"
          className="input pl-9"
          placeholder="Cari keterangan atau kategori..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          aria-label="Cari pengeluaran"
        />
      </div>

      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter kategori">
        {(['Semua', ...CATEGORIES] as (Category | 'Semua')[]).map(cat => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            aria-pressed={filterCat === cat}
            className={`px-3 py-1 text-xs rounded-full border font-medium transition-colors ${
              filterCat === cat
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
