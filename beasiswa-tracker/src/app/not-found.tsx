import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-6">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Laporan tidak ditemukan</h1>
        <p className="text-gray-500 mb-6">
          Link yang kamu akses tidak valid atau laporan sudah dihapus.
        </p>
        <Link href="/login" className="btn-primary inline-block">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  );
}
