'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, GraduationCap, User, Wallet, RotateCcw, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/Toast';
import ExpenseTable from '@/components/expenses/ExpenseTable';
import ExpenseForm, {
  type ExpenseFormValues,
  validateAmount,
  sanitizeText,
} from '@/components/expenses/ExpenseForm';
import ConfirmModal from '@/components/ConfirmModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { formatRupiah, formatDate } from '@/lib/utils';
import type { AdminBudget, Expense } from '@/lib/types';

interface Profile {
  full_name:  string | null;
  university: string | null;
  email:      string | null;
}

interface Props {
  userId:         string;
  profile:        Profile;
  initialBudgets: AdminBudget[];
}

const EMPTY_SET = new Set<string>();

export default function AdminUserDetail({ userId, profile, initialBudgets }: Props) {
  const supabase = createClient();
  const { toast } = useToast();

  const [budgets, setBudgets]                           = useState<AdminBudget[]>(initialBudgets);
  const [editBudgetTarget, setEditBudgetTarget]         = useState<AdminBudget | null>(null);
  const [editBudgetSubmitting, setEditBudgetSubmitting] = useState(false);
  const [reactivateTarget, setReactivateTarget]         = useState<AdminBudget | null>(null);
  const [reactivateSubmitting, setReactivateSubmitting] = useState(false);

  const [selectedBudgetId, setSelectedBudgetId]         = useState<string | null>(null);
  const [budgetExpenses, setBudgetExpenses]             = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses]           = useState(false);

  const [editExpenseTarget, setEditExpenseTarget]       = useState<Expense | null>(null);
  const [editExpenseSubmitting, setEditExpenseSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget]                 = useState<Expense | null>(null);
  const [deleting, setDeleting]                         = useState(false);

  async function loadBudgetExpenses(budgetId: string) {
    if (selectedBudgetId === budgetId) {
      setSelectedBudgetId(null);
      setBudgetExpenses([]);
      return;
    }
    setSelectedBudgetId(budgetId);
    setLoadingExpenses(true);
    setBudgetExpenses([]);

    const { data, error } = await supabase.rpc('admin_get_budget_expenses', {
      p_budget_id: budgetId,
    });

    if (error) {
      console.error('[AdminBudgetExpenses]', error.message);
      toast('Gagal memuat pengeluaran. Silakan coba lagi.', 'error');
    } else {
      const expenses: Expense[] = (data ?? []).map((e: Omit<Expense, 'user_id'>) => ({
        ...e, user_id: userId,
      }));
      setBudgetExpenses(expenses);
    }
    setLoadingExpenses(false);
  }

  async function handleEditBudget(amount: number, startDate: string) {
    if (!editBudgetTarget) return;
    setEditBudgetSubmitting(true);

    const { data, error } = await supabase.rpc('admin_update_budget', {
      p_budget_id:  editBudgetTarget.id,
      p_amount:     amount,
      p_start_date: startDate,
    });

    if (error) {
      toast('Gagal menyimpan budget. Silakan coba lagi.', 'error');
    } else if (data) {
      setBudgets(prev => prev.map(b =>
        b.id === editBudgetTarget.id
          ? { ...b, amount: data.amount, start_date: data.start_date }
          : b
      ));
      toast('Budget berhasil diperbarui.');
      setEditBudgetTarget(null);
    }
    setEditBudgetSubmitting(false);
  }

  async function handleReactivate(newStartDate: string) {
    if (!reactivateTarget) return;
    setReactivateSubmitting(true);

    const { error } = await supabase.rpc('admin_reactivate_budget', {
      p_budget_id:      reactivateTarget.id,
      p_new_start_date: newStartDate,
    });

    if (error) {
      toast('Gagal mengaktifkan budget. Silakan coba lagi.', 'error');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setBudgets(prev => prev.map(b => {
        if (b.id === reactivateTarget.id) return { ...b, end_date: null, start_date: newStartDate };
        if (b.end_date === null) return { ...b, end_date: today };
        return b;
      }));
      toast('Budget berhasil diaktifkan kembali.');
      setReactivateTarget(null);
    }
    setReactivateSubmitting(false);
  }

  async function handleEditExpense(values: ExpenseFormValues) {
    if (!editExpenseTarget) return;
    const amountResult = validateAmount(values.amount);
    if (!amountResult.valid) return;
    setEditExpenseSubmitting(true);

    const { data, error } = await supabase.rpc('admin_update_expense', {
      p_expense_id:  editExpenseTarget.id,
      p_amount:      amountResult.value,
      p_category:    values.category,
      p_description: sanitizeText(values.description) || null,
      p_date:        values.date,
    });

    if (error) {
      toast('Gagal menyimpan perubahan. Silakan coba lagi.', 'error');
    } else if (data) {
      setBudgetExpenses(prev => prev.map(e =>
        e.id === editExpenseTarget.id
          ? { ...e, amount: data.amount, category: data.category,
              description: data.description, date: data.date, updated_at: data.updated_at }
          : e
      ));
      toast('Transaksi berhasil diperbarui.');
      setEditExpenseTarget(null);
    }
    setEditExpenseSubmitting(false);
  }

  async function handleDeleteExpense() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase.rpc('admin_delete_expense', {
      p_expense_id: deleteTarget.id,
    });

    if (error) {
      toast('Gagal menghapus transaksi. Silakan coba lagi.', 'error');
    } else {
      setBudgetExpenses(prev => prev.filter(e => e.id !== deleteTarget.id));
      toast('Transaksi berhasil dihapus.');
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  const displayName = profile.full_name || 'Tanpa Nama';

  return (
    <div className="space-y-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        aria-label="Kembali ke daftar user"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        Semua User
      </Link>

      {/* Profile */}
      <section aria-labelledby="profile-heading">
        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <User className="w-6 h-6 text-brand-600" />
            </div>
            <div className="min-w-0">
              <h1 id="profile-heading" className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
              <div className="mt-2 space-y-1">
                {profile.email && (
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    {profile.email}
                  </p>
                )}
                {profile.university && (
                  <p className="flex items-center gap-2 text-sm text-gray-500">
                    <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                    {profile.university}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget + Expenses accordion */}
      <section aria-labelledby="budget-heading">
        <h2 id="budget-heading" className="text-lg font-semibold text-gray-900 mb-3">
          Riwayat Budget
        </h2>

        {budgets.length === 0 ? (
          <div className="card p-8 text-center text-gray-400" role="status">Belum ada budget.</div>
        ) : (
          <div className="space-y-3">
            {budgets.map(budget => {
              const isActive    = budget.end_date === null;
              const isExpanded  = selectedBudgetId === budget.id;

              return (
                <div key={budget.id} className="card overflow-hidden">
                  {/* Budget row */}
                  <div className="flex items-center justify-between px-4 py-3 gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{formatRupiah(budget.amount)}</span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <Wallet className="w-3 h-3" aria-hidden="true" /> Aktif
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Selesai</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(budget.start_date)}
                        {budget.end_date ? ` — ${formatDate(budget.end_date)}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditBudgetTarget(budget)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                        aria-label={`Edit budget ${formatRupiah(budget.amount)}`}
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit
                      </button>
                      {!isActive && (
                        <button
                          onClick={() => setReactivateTarget(budget)}
                          className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
                          aria-label={`Reaktivasi budget ${formatRupiah(budget.amount)}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reaktivasi
                        </button>
                      )}
                      <button
                        onClick={() => loadBudgetExpenses(budget.id)}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Tutup' : 'Lihat'} pengeluaran budget ini`}
                      >
                        {isExpanded
                          ? <><ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> Tutup</>
                          : <><ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> Pengeluaran</>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expandable expenses */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 py-4">
                      {loadingExpenses ? (
                        <p className="text-sm text-gray-400 text-center py-4">Memuat pengeluaran...</p>
                      ) : budgetExpenses.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Belum ada pengeluaran pada periode ini.</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mb-3">{budgetExpenses.length} transaksi</p>
                          <ExpenseTable
                            expenses={budgetExpenses}
                            optimisticIds={EMPTY_SET}
                            onEdit={setEditExpenseTarget}
                            onDelete={setDeleteTarget}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      {editBudgetTarget && (
        <EditBudgetModal
          budget={editBudgetTarget}
          submitting={editBudgetSubmitting}
          onSubmit={handleEditBudget}
          onClose={() => setEditBudgetTarget(null)}
        />
      )}
      {reactivateTarget && (
        <ReactivateModal
          budget={reactivateTarget}
          submitting={reactivateSubmitting}
          onSubmit={handleReactivate}
          onClose={() => setReactivateTarget(null)}
        />
      )}
      {editExpenseTarget && (
        <ExpenseForm
          initial={editExpenseTarget}
          submitting={editExpenseSubmitting}
          onSubmit={handleEditExpense}
          onClose={() => setEditExpenseTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Hapus transaksi ini?"
          description={`${deleteTarget.description || deleteTarget.category} · ${formatRupiah(deleteTarget.amount)}`}
          confirmLabel="Hapus"
          loading={deleting}
          onConfirm={handleDeleteExpense}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Modal components ─────────────────────────────────────────────────────────

interface EditBudgetModalProps {
  budget: AdminBudget; submitting: boolean;
  onSubmit: (amount: number, startDate: string) => void; onClose: () => void;
}

function EditBudgetModal({ budget, submitting, onSubmit, onClose }: EditBudgetModalProps) {
  const [amount, setAmount]       = useState(budget.amount.toString());
  const [startDate, setStartDate] = useState(budget.start_date);
  const [error, setError]         = useState('');
  const trapRef = useFocusTrap(true);
  const today   = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) { setError('Dana harus berupa angka lebih dari 0.'); return; }
    if (!startDate) { setError('Tanggal mulai wajib diisi.'); return; }
    onSubmit(Math.round(parsed), startDate);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="edit-budget-title">
      <div className="absolute inset-0" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="edit-budget-title" className="font-semibold text-gray-900">Edit Budget</h2>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Tutup" className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate autoComplete="off">
          <div>
            <label htmlFor="budget-amount" className="label">Dana (Rp)</label>
            <input id="budget-amount" type="number" className="input" min="1" step="1" value={amount}
              onChange={e => { setAmount(e.target.value); setError(''); }} required />
          </div>
          <div>
            <label htmlFor="budget-start" className="label">Tanggal Mulai</label>
            <input id="budget-start" type="date" className="input" value={startDate} max={today}
              onChange={e => { setStartDate(e.target.value); setError(''); }} required />
          </div>
          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ReactivateModalProps {
  budget: AdminBudget; submitting: boolean;
  onSubmit: (newStartDate: string) => void; onClose: () => void;
}

function ReactivateModal({ budget, submitting, onSubmit, onClose }: ReactivateModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [newStartDate, setNewStartDate] = useState(today);
  const [error, setError]               = useState('');
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!newStartDate) { setError('Tanggal mulai wajib diisi.'); return; }
    if (newStartDate > today) { setError('Tanggal mulai tidak boleh di masa depan.'); return; }
    onSubmit(newStartDate);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reactivate-title">
      <div className="absolute inset-0" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <RotateCcw className="w-6 h-6 text-amber-600" />
        </div>
        <h2 id="reactivate-title" className="font-semibold text-gray-900 text-center mb-2">Aktifkan Budget Ini?</h2>
        <p className="text-sm text-gray-500 text-center mb-5">
          Budget <strong>{formatRupiah(budget.amount)}</strong> akan diaktifkan kembali.
          Budget yang sedang aktif akan ditutup otomatis pada tanggal reaktivasi.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate autoComplete="off">
          <div>
            <label htmlFor="reactivate-start" className="label">Tanggal Mulai</label>
            <input id="reactivate-start" type="date" className="input" value={newStartDate} max={today}
              onChange={e => { setNewStartDate(e.target.value); setError(''); }} required />
            <p className="text-xs text-gray-400 mt-1">Default hari ini. Hanya pengeluaran sejak tanggal ini yang dihitung.</p>
          </div>
          {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Memproses...' : 'Aktifkan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
