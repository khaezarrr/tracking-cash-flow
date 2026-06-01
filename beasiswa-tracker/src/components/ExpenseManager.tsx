'use client';

import { Plus, ChevronDown } from 'lucide-react';
import { type Expense } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { useExpenses } from '@/hooks/useExpenses';
import ExpenseForm from '@/components/expenses/ExpenseForm';
import ExpenseTable from '@/components/expenses/ExpenseTable';
import ExpenseFilters from '@/components/expenses/ExpenseFilters';
import ConfirmModal from '@/components/ConfirmModal';

interface Props {
  initialExpenses: Expense[];
  userId: string;
  totalCount: number;
  pageSize: number;
  activeBudgetStartDate: string | null;
  nextBudgetStartDate: string | null;
}

export default function ExpenseManager({ initialExpenses, userId, totalCount, pageSize, activeBudgetStartDate, nextBudgetStartDate }: Props) {
  const {
    expenses, filtered, totalFiltered, serverTotal, fetchOffset, optimisticIds, hasMore,
    showForm, editTarget, submitting, deleteTarget, deleting, loadingMore, search, filterCat,
    openAddForm, openEditForm, closeForm, setDeleteTarget, cancelDelete,
    handleSubmit, handleDelete, handleLoadMore, setSearch, setFilterCat,
  } = useExpenses({ initialExpenses, userId, totalCount, pageSize, activeBudgetStartDate, nextBudgetStartDate });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengeluaran</h1>
          <p className="text-gray-500 text-sm mt-1" aria-live="polite">
            {serverTotal} total transaksi
            {fetchOffset < serverTotal && ` · menampilkan ${expenses.length}`}
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="btn-primary flex items-center gap-2"
          aria-label="Tambah pengeluaran baru"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Tambah
        </button>
      </div>

      {showForm && (
        <ExpenseForm
          initial={editTarget}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={closeForm}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Hapus pengeluaran ini?"
          description="Tindakan ini tidak bisa dibatalkan."
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={cancelDelete}
        />
      )}

      <ExpenseFilters
        search={search}
        filterCat={filterCat}
        onSearchChange={setSearch}
        onCategoryChange={setFilterCat}
      />

      {filtered.length > 0 && (
        <p className="text-sm text-gray-500" aria-live="polite">
          Menampilkan <strong className="text-gray-900">{filtered.length}</strong> transaksi ·
          Total: <strong className="text-gray-900">{formatRupiah(totalFiltered)}</strong>
        </p>
      )}

      {filtered.length === 0 && expenses.length === 0 ? (
        <div className="card p-8 text-center text-gray-400" role="status">
          Belum ada pengeluaran. Tambahkan transaksi pertamamu!
        </div>
      ) : (
        <ExpenseTable
          expenses={filtered}
          optimisticIds={optimisticIds}
          onEdit={openEditForm}
          onDelete={setDeleteTarget}
        />
      )}

      {hasMore && search === '' && filterCat === 'Semua' && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="btn-secondary inline-flex items-center gap-2"
            aria-label={`Muat ${pageSize} transaksi berikutnya`}
          >
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
            {loadingMore ? 'Memuat...' : `Muat lebih banyak (${serverTotal - fetchOffset} tersisa)`}
          </button>
        </div>
      )}
    </div>
  );
}
