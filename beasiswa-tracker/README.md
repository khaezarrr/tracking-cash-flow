# Beasiswa Tracker

Aplikasi web untuk tracking pengeluaran uang saku beasiswa. Dilengkapi shareable link laporan yang bisa diberikan ke tim terkait.

---

## Fitur

- Register & login (email + password)
- Tambah, edit, hapus pengeluaran dengan kategori
- Dashboard ringkasan pengeluaran per kategori
- Buat laporan per rentang tanggal
- Shareable link unik per laporan (bisa dibuka tanpa login, read-only)

---

## Setup Langkah demi Langkah

### 1. Setup Supabase

1. Buka [supabase.com](https://supabase.com) → buat akun → buat project baru
2. Tunggu project selesai dibuat (~2 menit)
3. Buka **SQL Editor** di sidebar kiri
4. Copy seluruh isi file `supabase/schema.sql` → paste → klik **Run**
5. Buka **Project Settings → API**:
   - Copy **Project URL** → simpan
   - Copy **anon public** key → simpan

### 2. Setup Project Lokal

```bash
cd beasiswa-tracker
npm install
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

### 3. Jalankan di Lokal

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Deploy ke Vercel (Gratis)

1. Upload project ke GitHub (pastikan `.env.local` ada di `.gitignore`)
2. Buka [vercel.com](https://vercel.com) → sign in dengan GitHub
3. Klik **New Project** → pilih repo → klik **Deploy**
4. Buka **Project Settings → Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Buka **Deployments** → **Redeploy**

---

## Catatan Keamanan

Arsitektur keamanan sudah diimplementasi dengan benar:

**Shareable link laporan** menggunakan Supabase RPC `get_public_report_expenses()` 
dengan `SECURITY DEFINER`. Ini berarti:
- RLS pada tabel `expenses` tetap ketat — tidak ada policy "baca semua"
- Akses publik divalidasi di level database melalui token
- Service role key tidak pernah dikirim ke client
- Anon key tidak digunakan untuk membaca data user lain

**Tidak perlu** menambahkan policy tambahan apapun setelah menjalankan `schema.sql`.

---

## Struktur Project

```
src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx          # Layout dengan sidebar + ToastProvider
│   │   ├── page.tsx            # Dashboard utama
│   │   ├── loading.tsx         # Skeleton loading
│   │   ├── expenses/
│   │   │   ├── page.tsx
│   │   │   └── loading.tsx
│   │   └── reports/
│   │       ├── page.tsx
│   │       └── loading.tsx
│   ├── r/[token]/
│   │   └── page.tsx            # Halaman publik laporan (via RPC)
│   ├── login/page.tsx
│   ├── register/page.tsx       # University disimpan via metadata, bukan post-signup
│   └── not-found.tsx
├── components/
│   ├── expenses/
│   │   ├── ExpenseForm.tsx     # Form modal tambah/edit
│   │   ├── ExpenseFilters.tsx  # Search + filter kategori
│   │   └── ExpenseTable.tsx    # Daftar transaksi
│   ├── ConfirmModal.tsx        # Reusable delete confirm dengan focus trap
│   ├── ExpenseManager.tsx      # Orchestrator (state + CRUD + optimistic updates)
│   ├── ReportManager.tsx
│   ├── Sidebar.tsx
│   ├── Skeleton.tsx
│   └── Toast.tsx
├── hooks/
│   └── useFocusTrap.ts         # Focus management untuk modal
└── lib/
    ├── supabase/
    │   ├── client.ts
    │   └── server.ts
    ├── types.ts
    └── utils.ts
```
