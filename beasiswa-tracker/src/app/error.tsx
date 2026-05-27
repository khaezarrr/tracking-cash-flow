'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-red-500" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">Terjadi Kesalahan</h1>
          <p className="text-sm text-gray-500">
            Sesuatu yang tidak terduga terjadi. Coba lagi, atau kembali ke halaman utama.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Coba Lagi
          </button>
          <Link href="/dashboard" className="btn-secondary inline-flex items-center justify-center">
            Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
