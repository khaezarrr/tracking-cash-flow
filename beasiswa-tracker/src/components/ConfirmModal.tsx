'use client';

import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Props {
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  // Fix #6: icon jadi prop opsional, default Trash2
  // Komponen ini reusable — caller yang tahu konteksnya, bukan modal
  icon?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel = 'Hapus',
  loading = false,
  icon,
  onConfirm,
  onCancel,
}: Props) {
  const trapRef = useFocusTrap(true);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, loading]);

  const defaultIcon = <Trash2 className="w-6 h-6 text-red-500" />;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
    >
      <div className="absolute inset-0" onClick={!loading ? onCancel : undefined} aria-hidden="true" />

      <div ref={trapRef} className="relative bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 text-center">
        <div
          className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
          aria-hidden="true"
        >
          {icon ?? defaultIcon}
        </div>

        <h3 id="confirm-modal-title" className="font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p id="confirm-modal-desc" className="text-sm text-gray-500 mb-6">
          {description}
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1">
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
