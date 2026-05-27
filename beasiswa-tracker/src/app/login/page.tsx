'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BookOpen } from 'lucide-react';

// Fix #3: useSearchParams wajib dibungkus Suspense di Next.js 14 App Router
function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Baca ?next= dari URL, validasi hanya terima path internal
  // Cegah open redirect: /evil.com atau //evil.com ditolak
  const rawNext = searchParams.get('next') ?? '';
  const redirectTo =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard';

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Email atau password salah.');
      setLoading(false);
      return;
    }

    // Fix #3: redirect ke tujuan awal user, bukan selalu /dashboard
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-4">
          <BookOpen className="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Beasiswa Tracker</h1>
        <p className="text-gray-500 text-sm mt-1">Lacak pengeluaran uang saku beasiswamu</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Masuk ke akun</h2>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
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
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Belum punya akun?{' '}
          <Link href="/register" className="text-brand-600 font-medium hover:underline">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="w-full max-w-md card p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto mb-6" />
          <div className="space-y-4">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
