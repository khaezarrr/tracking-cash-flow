'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import type { ReportPDFData } from '@/lib/pdf/types';

interface Props {
  data: ReportPDFData;
}

export default function ExportPDFButton({ data }: Props) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    if (generating) return; // guard double-click
    setGenerating(true);
    try {
      // Dynamic import — jsPDF tidak masuk main bundle, hanya dimuat saat diklik
      const { generatePDF } = await import('@/lib/pdf/generatePDF');
      await generatePDF(data);
    } catch (err) {
      console.error('[ExportPDF]', err);
      alert('Gagal membuat PDF. Coba lagi.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={generating}
      aria-busy={generating}
      aria-label={generating ? 'Sedang membuat PDF...' : 'Export laporan sebagai PDF'}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white
                 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm
                 transition-colors hover:bg-gray-50
                 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Download className="w-4 h-4" aria-hidden="true" />
      {generating ? 'Membuat PDF...' : 'Export PDF'}
    </button>
  );
}
