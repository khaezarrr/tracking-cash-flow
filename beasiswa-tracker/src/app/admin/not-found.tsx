import Link from 'next/link';
import { UserX } from 'lucide-react';

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <UserX className="w-7 h-7 text-gray-400" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">Halaman Tidak Ditemukan</h1>
          <p className="text-sm text-gray-500">
            User atau halaman yang kamu cari tidak ada, atau sudah dihapus.
          </p>
        </div>

        <Link href="/admin" className="btn-secondary inline-flex items-center justify-center">
          Kembali ke Daftar User
        </Link>
      </div>
    </div>
  );
}
