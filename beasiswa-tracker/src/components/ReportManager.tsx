'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type Report } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Plus, Link2, X, Copy, Check, ExternalLink, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  initialReports: Report[];
  userId: string;
}

const emptyForm = { title: '', date_from: '', date_to: '' };

// Fix #7: userId dihapus dari props ReportFormModal karena tidak pernah dipakai di sini.
// userId hanya dibutuhkan di ReportManager saat insert — sesuai dengan tempatnya.
interface ReportFormModalProps {
  submitting: boolean;
  onSubmit: (form: typeof emptyForm) => void;
  onClose: () => void;
}

function ReportFormModal({ submitting, onSubmit, onClose }: ReportFormModalProps) {
  const trapRef = useFocusTrap(true);
  const [form, setForm] = useState(emptyForm);
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
    if (!form.title.trim())               { setFormError('Judul laporan wajib diisi.'); return; }
    if (!form.date_from || !form.date_to) { setFormError('Tanggal mulai dan selesai wajib diisi.'); return; }
    if (form.date_to < form.date_from)    { setFormError('Tanggal selesai harus setelah tanggal mulai.'); return; }
    onSubmit(form);
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-form-title"
    >
      <div className="absolute inset-0" onClick={!submitting ? onClose : undefined} aria-hidden="true" />

      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 id="report-form-title" className="font-semibold text-gray-900">Buat Laporan Baru</h2>
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
            <label htmlFor="report-title" className="label">Judul Laporan</label>
            <input
              id="report-title"
              type="text"
              className="input"
              placeholder="Laporan Semester Ganjil 2024/2025"
              maxLength={200}
              value={form.title}
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(''); }}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="report-date-from" className="label">Tanggal Mulai</label>
              <input
                id="report-date-from"
                type="date"
                className="input"
                value={form.date_from}
                onChange={e => { setForm(f => ({ ...f, date_from: e.target.value })); setFormError(''); }}
                required
              />
            </div>
            <div>
              <label htmlFor="report-date-to" className="label">Tanggal Selesai</label>
              <input
                id="report-date-to"
                type="date"
                className="input"
                value={form.date_to}
                min={form.date_from || undefined}
                onChange={e => { setForm(f => ({ ...f, date_to: e.target.value })); setFormError(''); }}
                required
              />
            </div>
          </div>

          {formError && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Membuat...' : 'Buat Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ReportManager({ initialReports, userId }: Props) {
  const supabase = createClient();
  const { toast } = useToast();

  const [reports, setReports] = useState<Report[]>(initialReports);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  async function handleCreate(form: typeof emptyForm) {
    setSubmitting(true);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Report = {
      id: tempId,
      user_id: userId,
      title: form.title.trim(),
      date_from: form.date_from,
      date_to: form.date_to,
      token: '...',
      created_at: new Date().toISOString(),
    };
    setReports(prev => [optimistic, ...prev]);
    setShowForm(false);

    const { data, error } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        title: form.title.trim().slice(0, 200),
        date_from: form.date_from,
        date_to: form.date_to,
      })
      .select()
      .single();

    if (error) {
      console.error('[Create report]', error.message);
      setReports(prev => prev.filter(r => r.id !== tempId));
      toast('Gagal membuat laporan. Coba lagi.', 'error');
    } else if (data) {
      setReports(prev => prev.map(r => r.id === tempId ? data : r));
      toast('Laporan berhasil dibuat.');
    }

    setSubmitting(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const backup = deleteTarget;
    const backupIndex = reports.findIndex(r => r.id === backup.id);
    setReports(prev => prev.filter(r => r.id !== backup.id));
    setDeleteTarget(null);

    const { error } = await supabase.from('reports').delete().eq('id', backup.id);

    if (error) {
      console.error('[Delete report]', error.message);
      setReports(prev => {
        const next = [...prev];
        next.splice(backupIndex, 0, backup);
        return next;
      });
      toast('Gagal menghapus laporan.', 'error');
    } else {
      toast('Laporan dihapus. Link tidak lagi bisa diakses.');
    }

    setDeleting(false);
  }

  async function copyLink(token: string) {
    if (token === '...') return;
    try {
      await navigator.clipboard.writeText(`${origin}/r/${token}`);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
      toast('Link berhasil disalin.');
    } catch {
      toast('Gagal menyalin link.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-500 text-sm mt-1">Buat laporan dan bagikan ke tim terkait</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-2"
          aria-label="Buat laporan baru"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Buat Laporan
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700" role="note">
        <strong>Cara kerja link laporan:</strong> Setiap laporan menghasilkan link unik yang bisa dibuka
        siapa saja tanpa login. Link menampilkan pengeluaran dalam rentang tanggal yang dipilih, hanya bisa dibaca.
      </div>

      {/* Fix #7: tidak ada userId di sini */}
      {showForm && (
        <ReportFormModal
          submitting={submitting}
          onSubmit={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Hapus laporan ini?"
          description="Link yang sudah dibagikan tidak akan bisa diakses lagi."
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {reports.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <Link2 className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada laporan</p>
          <p className="text-gray-400 text-sm mt-1">Buat laporan untuk membagikan ringkasan pengeluaranmu</p>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Daftar laporan">
          {reports.map(report => {
            const isPending = report.token === '...';
            return (
              <div
                key={report.id}
                className={`card p-5 transition-opacity ${isPending ? 'opacity-60' : ''}`}
                role="listitem"
                aria-busy={isPending}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {report.title}
                      {isPending && <span className="ml-2 text-xs text-gray-400 font-normal">menyimpan...</span>}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      <time dateTime={report.date_from}>{formatDate(report.date_from)}</time>
                      {' — '}
                      <time dateTime={report.date_to}>{formatDate(report.date_to)}</time>
                    </p>
                    {!isPending && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-[180px]">
                          /r/{report.token}
                        </code>
                        <button
                          onClick={() => copyLink(report.token)}
                          aria-label={`Salin link laporan: ${report.title}`}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-brand-50 text-brand-700 hover:bg-brand-100 rounded transition-colors font-medium"
                        >
                          {copiedToken === report.token
                            ? <><Check className="w-3 h-3" aria-hidden="true" /> Disalin</>
                            : <><Copy className="w-3 h-3" aria-hidden="true" /> Salin Link</>
                          }
                        </button>
                        <a
                          href={`/r/${report.token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Buka laporan ${report.title} di tab baru`}
                          className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded transition-colors font-medium"
                        >
                          <ExternalLink className="w-3 h-3" aria-hidden="true" /> Buka
                        </a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(report)}
                    disabled={isPending}
                    aria-label={`Hapus laporan: ${report.title}`}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
