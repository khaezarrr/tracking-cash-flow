'use client';

import { useState, useEffect } from 'react';
import { type Budget } from '@/lib/types';
import { formatRupiah, formatDate } from '@/lib/utils';
import { useToast } from '@/components/Toast';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { Wallet, Plus, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { createBudgetAction } from '@/app/dashboard/settings/actions';

interface Props {
  initialBudgets: Budget[];
}

// ── Form Modal ──────────────────────────────────────────────
interface BudgetFormModalProps {
  submitting: boolean;
  onSubmit: (amount: string, startDate: string) => void;
  onClose: () => void;
}

function formatInputRupiah(digits: string): string {
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

function BudgetFormModal({ submitting, onSubmit, onClose }: BudgetFormModalProps) {
  const trapRef = useFocusTrap(true);
  const [displayAmount, setDisplayAmount] = useState('');
  const [rawAmount, setRawAmount] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '');
    setRawAmount(digits);
    setDisplayAmount(formatInputRupiah(digits));
    setFormError('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!rawAmount || Number(rawAmount) <= 0) {
      setFormError('Jumlah dana harus lebih dari 0.');
      return;
    }
    if (!startDate) {
      setFormError('Tanggal mulai wajib diisi.');
      return;
    }
    onSubmit(rawAmount, startDate);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-form-title"
    >
      <div className="absolute inset-0" onClick={!submitting ? onClose : undefined} aria-hidden="true" />
      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="budget-form-title" className="font-semibold text-gray-900">Buat Budget Baru</h2>
          <button
            type="button" onClick={onClose} disabled={submitting}
            aria-label="Tutup form"
            className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label htmlFor="budget-amount" className="label">Dana Beasiswa (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
              <input
                id="budget-amount"
                type="text"
                inputMode="numeric"
                className="input pl-9"
                placeholder="3.600.000"
                value={displayAmount}
                onChange={handleAmountChange}
                required
                aria-describedby={formError ? 'budget-form-error' : undefined}
              />
            </div>
          </div>

          <div>
            <label htmlFor="budget-start" className="label">Tanggal Mulai</label>
            <input
              id="budget-start"
              type="date" className="input"
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setFormError(''); }}
              required
            />
          </div>

          {formError && (
            <div id="budget-form-error" role="alert"
              className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Menyimpan...' : 'Buat Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Warning Modal ───────────────────────────────────────────
interface ActiveBudgetWarningProps {
  activeBudget: Budget;
  onContinue: () => void;
  onCancel: () => void;
}

function ActiveBudgetWarning({ activeBudget, onContinue, onCancel }: ActiveBudgetWarningProps) {
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-warning-title"
      aria-describedby="budget-warning-desc"
    >
      <div className="absolute inset-0" onClick={onCancel} aria-hidden="true" />
      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 id="budget-warning-title" className="font-bold text-gray-900 text-lg">
              Budget Sedang Berjalan
            </h3>
            <p id="budget-warning-desc" className="text-gray-600 text-sm mt-2 leading-relaxed">
              Kamu sedang punya budget aktif sebesar{' '}
              <strong className="text-gray-900">{formatRupiah(activeBudget.amount)}</strong>{' '}
              yang dimulai sejak <strong className="text-gray-900">{formatDate(activeBudget.start_date)}</strong>.
            </p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <strong>Perhatian:</strong> Membuat budget baru akan menutup budget yang sedang berjalan
              secara otomatis. Budget lama tetap tersimpan di riwayat dan tidak bisa dibuka kembali.
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Batal
          </button>
          <button
            onClick={onContinue}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Lanjut Buat Budget Baru
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────
export default function BudgetSection({ initialBudgets }: Props) {
  const { toast } = useToast();

  const [budgets, setBudgets] = useState<Budget[]>(initialBudgets);
  const [showWarning, setShowWarning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeBudget = budgets.find(b => b.end_date === null) ?? null;

  function handleNewBudgetClick() {
    if (activeBudget) {
      setShowWarning(true);
    } else {
      setShowForm(true);
    }
  }

  async function handleSubmit(amount: string, startDate: string) {
    setSubmitting(true);

    try {
      const data = await createBudgetAction(parseFloat(amount), startDate);

      setBudgets(prev => [
        data as Budget,
        ...prev.map(b => b.end_date === null ? { ...b, end_date: startDate } : b),
      ]);

      toast('Budget baru berhasil dibuat.');
      setShowForm(false);
    } catch (err) {
      console.error('[create_budget]', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('tidak boleh lebih awal')) {
        toast('Tanggal mulai tidak boleh lebih awal dari budget yang sedang aktif.', 'error');
      } else if (msg.includes('Amount must be greater than 0')) {
        toast('Jumlah budget harus lebih dari 0.', 'error');
      } else {
        toast('Gagal membuat budget. Silakan coba lagi.', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center" aria-hidden="true">
            <Wallet className="w-5 h-5 text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Manajemen Budget</h2>
        </div>
        <button
          onClick={handleNewBudgetClick}
          className="btn-primary flex items-center gap-2 text-sm"
          aria-label="Buat budget baru"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Buat Budget Baru
        </button>
      </div>

      {showWarning && activeBudget && (
        <ActiveBudgetWarning
          activeBudget={activeBudget}
          onContinue={() => { setShowWarning(false); setShowForm(true); }}
          onCancel={() => setShowWarning(false)}
        />
      )}

      {showForm && (
        <BudgetFormModal
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={() => setShowForm(false)}
        />
      )}

      {budgets.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Wallet className="w-8 h-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
          <p className="text-sm">Belum ada budget. Buat budget pertamamu!</p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Riwayat budget">
          {budgets.map(budget => {
            const isActive = budget.end_date === null;
            return (
              <div
                key={budget.id}
                role="listitem"
                className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${
                  isActive
                    ? 'border-brand-200 bg-brand-50'
                    : 'border-gray-100 bg-gray-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{formatRupiah(budget.amount)}</p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle className="w-3 h-3" aria-hidden="true" />
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Mulai: <time dateTime={budget.start_date}>{formatDate(budget.start_date)}</time>
                    {budget.end_date && (
                      <>
                        {' · '}Selesai: <time dateTime={budget.end_date}>{formatDate(budget.end_date)}</time>
                      </>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Riwayat budget tidak dapat diedit atau dihapus untuk menjaga integritas laporan.
      </p>
    </div>
  );
}
