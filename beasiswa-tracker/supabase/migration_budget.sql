-- ============================================================
-- MIGRATION: Budget Feature
-- Jalankan di Supabase SQL Editor jika kamu SUDAH menjalankan
-- schema.sql sebelumnya. Kalau setup dari awal, cukup jalankan
-- schema.sql yang sudah diperbarui (sudah include semua ini).
-- ============================================================

-- 1. Tabel budgets
CREATE TABLE IF NOT EXISTS budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  start_date DATE NOT NULL,
  end_date   DATE,           -- NULL = budget aktif
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_budget_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- 2. Aktifkan RLS
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 3. Policy SELECT — hanya pemilik
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT USING (auth.uid() = user_id);

-- 4. Policy INSERT — hanya pemilik
-- INSERT tetap diizinkan via RLS karena RPC create_budget() butuh INSERT.
-- RPC dijalankan sebagai SECURITY DEFINER, bukan sebagai caller,
-- tapi INSERT policy tetap diperlukan agar RPC bisa insert atas nama user.
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Tidak ada UPDATE / DELETE policy untuk user biasa.
-- Update end_date saat budget baru dibuat dilakukan via RPC create_budget()
-- yang berjalan sebagai SECURITY DEFINER (postgres superuser), bukan sebagai caller.
-- Ini artinya RLS bypass untuk operasi UPDATE di dalam RPC — aman karena
-- RPC sendiri yang memvalidasi auth.uid() sebelum melakukan update.

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id    ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_start_date ON budgets(start_date);

-- ============================================================
-- RPC: create_budget
--
-- Menangani dua operasi secara atomik dalam satu transaksi:
-- a) Tutup budget aktif (set end_date = start_date budget baru)
-- b) Insert budget baru
--
-- SECURITY DEFINER diperlukan untuk langkah (a) karena user tidak
-- punya UPDATE policy. Validasi auth.uid() di dalam fungsi memastikan
-- user hanya bisa menutup budget miliknya sendiri.
-- ============================================================
CREATE OR REPLACE FUNCTION create_budget(
  p_amount     NUMERIC,
  p_start_date DATE
)
RETURNS budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_new_budget budgets;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  IF p_start_date IS NULL THEN
    RAISE EXCEPTION 'Start date is required';
  END IF;

  -- Tutup budget aktif jika ada (end_date = start_date budget baru)
  UPDATE budgets
  SET    end_date = p_start_date
  WHERE  user_id  = v_user_id
    AND  end_date IS NULL;

  -- Insert budget baru
  INSERT INTO budgets (user_id, amount, start_date)
  VALUES (v_user_id, p_amount, p_start_date)
  RETURNING * INTO v_new_budget;

  RETURN v_new_budget;
END;
$$;

GRANT EXECUTE ON FUNCTION create_budget(NUMERIC, DATE) TO authenticated;

-- ============================================================
-- RPC: get_public_report_budget
--
-- Versi terpisah dari get_public_report_expenses() untuk data budget.
-- Dipisah karena mixing budget (1 row) dan expenses (N rows) dalam
-- satu RETURNS TABLE akan membuat budget data terduplikasi per baris.
--
-- Kondisi overlap: start_date <= date_to laporan
--                 AND (end_date >= date_from laporan OR end_date IS NULL)
-- ============================================================
CREATE OR REPLACE FUNCTION get_public_report_budget(report_token TEXT)
RETURNS TABLE (
  budget_amount  NUMERIC,
  start_date     DATE,
  end_date       DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_date_from DATE;
  v_date_to   DATE;
BEGIN
  SELECT r.user_id, r.date_from, r.date_to
  INTO   v_user_id, v_date_from, v_date_to
  FROM   reports r
  WHERE  r.token = report_token
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT b.amount, b.start_date, b.end_date
    FROM   budgets b
    WHERE  b.user_id    = v_user_id
      AND  b.start_date <= v_date_to
      AND  (b.end_date  >= v_date_from OR b.end_date IS NULL)
    ORDER BY b.start_date DESC
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_report_budget(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report_budget(TEXT) TO authenticated;
