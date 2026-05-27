'use client';

import { Pencil, Trash2, Calendar } from 'lucide-react';
import { type Expense, type Category, CATEGORY_COLORS } from '@/lib/types';
import { formatRupiah, formatDateShort } from '@/lib/utils';

interface Props {
  expenses: Expense[];
  optimisticIds: Set<string>;          // IDs being saved — shown dimmed
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export default function ExpenseTable({ expenses, optimisticIds, onEdit, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="card p-8 text-center text-gray-400" role="status">
        Tidak ada transaksi yang cocok.
      </div>
    );
  }

  return (
    <div className="card divide-y divide-gray-50" role="list" aria-label="Daftar pengeluaran">
      {expenses.map(expense => {
        const isPending = optimisticIds.has(expense.id);
        const color = CATEGORY_COLORS[expense.category as Category] ?? '#6b7280';

        return (
          <div
            key={expense.id}
            className={`flex items-center justify-between gap-4 p-4 transition-all ${
              isPending ? 'opacity-60' : 'hover:bg-gray-50'
            }`}
            role="listitem"
            aria-busy={isPending}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {expense.description || expense.category}
                  {isPending && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">menyimpan...</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  <time dateTime={expense.date}>{formatDateShort(expense.date)}</time>
                  <span aria-hidden="true" className="mx-1">·</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs"
                    style={{ backgroundColor: color + '20', color }}
                  >
                    {expense.category}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="font-semibold text-gray-900 text-sm">
                {formatRupiah(expense.amount)}
              </span>
              <button
                onClick={() => onEdit(expense)}
                disabled={isPending}
                aria-label={`Edit: ${expense.description || expense.category}`}
                className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors disabled:opacity-40"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                onClick={() => onDelete(expense)}
                disabled={isPending}
                aria-label={`Hapus: ${expense.description || expense.category}`}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
