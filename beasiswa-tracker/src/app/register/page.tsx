'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      setLoading(false);
      return;
    }

    /**
     * Fix #1 — Race condition dihilangkan sepenuhnya.
     *
     * Sebelumnya: signUp() → getUser() → update profiles
     * Masalah: kalau Supabase pakai email confirmation, getUser() return null
     * dan update university silently gagal.
     *
     * Sekarang: university dimasukkan ke dalam options.data (raw_user_meta_data)
     * saat signUp. DB trigger handle_new_user() membacanya langsung saat
     * row di auth.users dibuat — tidak peduli apakah email sudah dikonfirmasi
     * atau belum. Tidak ada getUser() post-signup sama sekali.
     */
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          university: university.trim(),  // ← trigger akan membaca ini
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Redirect ke dashboard — kalau Supabase pakai email confirmation,
    // user akan diarahkan ke login dengan pesan "cek email kamu" di sana.
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-4">
            <BookOpen className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Beasiswa Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Buat akun baru</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Daftar akun</h2>

          <form onSubmit={handleRegister} className="space-y-4" noValidate>
            <div>
              <label htmlFor="full-name" className="label">Nama Lengkap</label>
              <input
                id="full-name"
                type="text"
                className="input"
                placeholder="Ahmad Fauzi"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="university" className="label">
                Universitas <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                id="university"
                type="text"
                className="input"
                placeholder="Universitas Indonesia"
                value={university}
                onChange={e => setUniversity(e.target.value)}
                autoComplete="organization"
              />
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="email@universitas.ac.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="Minimal 8 karakter"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Mendaftar...' : 'Daftar'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Sudah punya akun?{' '}
            <Link href="/login" className="text-brand-600 font-medium hover:underline">
              Masuk
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
