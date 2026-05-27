'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CATEGORIES, type Category, type Expense } from '@/lib/types';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { formatRupiah } from '@/lib/utils';

const MAX_AMOUNT = 100_000_000;

export interface ExpenseFormValues {
  amount: string;
  category: Category;
  description: string;
  date: string;
}

/**
 * Fix #5: emptyFormValues dulunya konstanta module-level.
 * new Date() dievaluasi sekali saat module di-load, bukan saat form dibuka.
 * Kalau app dibuka tengah malam dan form dibuka keesokan harinya, date salah.
 *
 * Sekarang jadi fungsi — date dihitung fresh setiap kali dipanggil.
 */
export function getEmptyFormValues(): ExpenseFormValues {
  return {
    amount: '',
    category: CATEGORIES[0],
    description: '',
    date: new Date().toISOString().split('T')[0],
  };
}

interface Props {
  initial?: Expense | null;
  submitting: boolean;
  onSubmit: (values: ExpenseFormValues) => void;
  onClose: () => void;
}

export function validateAmount(raw: string): { valid: boolean; value: number; message: string } {
  const trimmed = raw.trim();
  if (!trimmed)            return { valid: false, value: 0, message: 'Jumlah wajib diisi.' };
  const parsed = parseFloat(trimmed);
  if (isNaN(parsed))       return { valid: false, value: 0, message: 'Jumlah harus berupa angka.' };
  if (!isFinite(parsed))   return { valid: false, value: 0, message: 'Jumlah tidak valid.' };
  if (parsed <= 0)         return { valid: false, value: 0, message: 'Jumlah harus lebih dari 0.' };
  if (parsed > MAX_AMOUNT) return { valid: false, value: 0, message: `Maksimal ${formatRupiah(MAX_AMOUNT)}.` };
  return { valid: true, value: Math.round(parsed), message: '' };
}

export function sanitizeText(input: string): string {
  return input.trim().replace(/\s+/g, ' ').slice(0, 200);
}

export default function ExpenseForm({ initial, submitting, onSubmit, onClose }: Props) {
  const isEdit = !!initial;
  const trapRef = useFocusTrap(true);

  const [form, setForm] = useState<ExpenseFormValues>(
    initial
      ? {
          amount: initial.amount.toString(),
          category: initial.category,
          description: initial.description ?? '',
          date: initial.date,
        }
      : getEmptyFormValues() // Fix #5: computed at render, not module load
  );
  const [formError, setFormError] = useState('');

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, submitting]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const validation = validateAmount(form.amount);
    if (!validation.valid) { setFormError(validation.message); return; }
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-title"
    >
      <div className="absolute inset-0" onClick={!submitting ? onClose : undefined} aria-hidden="true" />

      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="expense-form-title" className="font-semibold text-gray-900">
            {isEdit ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup form"
            className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div>
            <label htmlFor="exp-amount" className="label">Jumlah (Rp)</label>
            <input
              id="exp-amount"
              type="number"
              className="input"
              placeholder="50000"
              min="1"
              max={MAX_AMOUNT}
              step="1"
              value={form.amount}
              onChange={e => { setForm(f => ({ ...f, amount: e.target.value })); setFormError(''); }}
              required
              aria-describedby={formError ? 'exp-form-error' : undefined}
            />
          </div>

          <div>
            <label htmlFor="exp-category" className="label">Kategori</label>
            <select
              id="exp-category"
              className="input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value as Category }))}
            >
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="exp-description" className="label">
              Keterangan <span className="text-gray-400 font-normal">(opsional)</span>
            </label>
            <input
              id="exp-description"
              type="text"
              className="input"
              placeholder="Makan siang di kantin"
              maxLength={200}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label htmlFor="exp-date" className="label">Tanggal</label>
            <input
              id="exp-date"
              type="date"
              className="input"
              value={form.date}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              required
            />
          </div>

          {formError && (
            <div id="exp-form-error" role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
