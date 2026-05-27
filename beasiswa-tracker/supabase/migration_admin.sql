-- ============================================================
-- BEASISWA TRACKER — Admin Panel Migration
-- Jalankan di Supabase SQL Editor
--
-- Untuk setup BARU: tambahkan ini di akhir schema.sql
-- Untuk setup LAMA: jalankan file ini saja (idempotent)
-- ============================================================


-- ============================================================
-- STEP 1 — Tambah kolom role di tabel profiles
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Set role admin manual lewat dashboard atau jalankan:
-- UPDATE profiles SET role = 'admin' WHERE id = '<your-user-id>';


-- ============================================================
-- STEP 2 — Helper: is_admin()
--
-- Kenapa pakai SECURITY DEFINER dan bukan langsung di policy?
-- Policy RLS yang query ke tabel profiles (untuk cek role)
-- dari dalam policy profiles itu sendiri = infinite recursion.
-- SECURITY DEFINER function bypass RLS → aman, tidak rekursif.
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Authenticated user bisa memanggil is_admin() untuk cek diri sendiri
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;


-- ============================================================
-- STEP 3 — RLS: Admin bisa SELECT semua profil
--
-- Policy ini di-OR dengan "Users can view own profile" yang sudah ada.
-- Hasilnya: user biasa hanya lihat sendiri, admin lihat semua.
-- ============================================================

DROP POLICY IF EXISTS "Admin can view all profiles" ON profiles;
CREATE POLICY "Admin can view all profiles"
  ON profiles FOR SELECT
  USING (is_admin());


-- ============================================================
-- STEP 4 — RPC: get_all_users_summary()
--
-- Return: semua user + budget aktif + total pengeluaran sejak
-- budget start_date + saldo tersisa.
-- Validasi admin di dalam fungsi sebelum return data apapun.
-- ============================================================

CREATE OR REPLACE FUNCTION get_all_users_summary()
RETURNS TABLE (
  user_id        UUID,
  full_name      TEXT,
  university     TEXT,
  budget_id      UUID,
  budget_amount  NUMERIC,
  budget_start   DATE,
  total_expenses NUMERIC,  -- NULL jika tidak ada budget aktif
  remaining      NUMERIC   -- NULL jika tidak ada budget aktif
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
    SELECT
      p.id                                AS user_id,
      p.full_name,
      p.university,
      b.id                                AS budget_id,
      b.amount                            AS budget_amount,
      b.start_date                        AS budget_start,
      -- total pengeluaran hanya dihitung jika ada budget aktif
      CASE WHEN b.id IS NOT NULL
           THEN spend.total_expenses
           ELSE NULL::NUMERIC
      END                                 AS total_expenses,
      CASE WHEN b.id IS NOT NULL
           THEN b.amount - spend.total_expenses
           ELSE NULL::NUMERIC
      END                                 AS remaining
    FROM   profiles p
    -- join hanya budget aktif (end_date IS NULL)
    LEFT   JOIN budgets b
           ON  b.user_id  = p.id
           AND b.end_date IS NULL
    -- lateral join: hanya evaluasi saat budget ada (ON b.id IS NOT NULL)
    -- jika tidak ada budget, spend.total_expenses otomatis NULL
    LEFT   JOIN LATERAL (
      SELECT COALESCE(SUM(e.amount), 0) AS total_expenses
      FROM   expenses e
      WHERE  e.user_id = p.id
        AND  e.date   >= b.start_date
    ) spend ON b.id IS NOT NULL
    ORDER  BY LOWER(p.full_name) NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_summary() TO authenticated;


-- ============================================================
-- STEP 5 — RPC: admin_get_user_budgets(p_user_id)
--
-- Return: semua budget user (aktif maupun tidak), diurutkan
-- dari yang terbaru. Digunakan di halaman detail user admin.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_user_budgets(p_user_id UUID)
RETURNS TABLE (
  id         UUID,
  amount     NUMERIC,
  start_date DATE,
  end_date   DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN QUERY
    SELECT b.id, b.amount, b.start_date, b.end_date, b.created_at
    FROM   budgets b
    WHERE  b.user_id = p_user_id
    ORDER  BY b.start_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_budgets(UUID) TO authenticated;


-- ============================================================
-- STEP 6 — RPC: admin_update_budget(p_budget_id, p_amount, p_start_date)
--
-- Edit amount atau start_date budget manapun (aktif maupun tidak).
-- NULL = tidak berubah.
-- Validasi: start_date baru tidak boleh lebih dari end_date yang ada.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_update_budget(
  p_budget_id  UUID,
  p_amount     NUMERIC DEFAULT NULL,
  p_start_date DATE    DEFAULT NULL
)
RETURNS budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget budgets;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;
  IF v_budget.id IS NULL THEN
    RAISE EXCEPTION 'Budget not found';
  END IF;

  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  -- Validasi: start_date baru tidak boleh melewati end_date yang sudah ada
  IF p_start_date IS NOT NULL
     AND v_budget.end_date IS NOT NULL
     AND p_start_date > v_budget.end_date THEN
    RAISE EXCEPTION 'Start date (%) cannot be after end date (%)',
      p_start_date, v_budget.end_date;
  END IF;

  UPDATE budgets
  SET
    amount     = COALESCE(p_amount,     amount),
    start_date = COALESCE(p_start_date, start_date)
  WHERE id = p_budget_id
  RETURNING * INTO v_budget;

  RETURN v_budget;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_budget(UUID, NUMERIC, DATE) TO authenticated;


-- ============================================================
-- STEP 7 — RPC: admin_reactivate_budget(p_budget_id, p_new_start_date)
--
-- Set end_date = NULL pada budget yang tidak aktif.
-- Otomatis tutup budget yang sedang aktif untuk user yang sama.
--
-- p_new_start_date (opsional):
--   Jika diisi → start_date budget diupdate sekaligus saat reaktivasi.
--   Jika NULL  → start_date asli dipertahankan.
--   UI sebaiknya default field ini ke CURRENT_DATE agar admin sadar
--   bahwa start_date lama akan menarik semua pengeluaran lama ke kalkulasi.
--
-- Validasi: p_new_start_date tidak boleh di masa depan.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_reactivate_budget(
  p_budget_id     UUID,
  p_new_start_date DATE DEFAULT NULL
)
RETURNS budgets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget       budgets;
  v_start_date   DATE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT * INTO v_budget FROM budgets WHERE id = p_budget_id;
  IF v_budget.id IS NULL THEN
    RAISE EXCEPTION 'Budget not found';
  END IF;
  IF v_budget.end_date IS NULL THEN
    RAISE EXCEPTION 'Budget is already active';
  END IF;

  -- Tentukan start_date yang akan dipakai
  v_start_date := COALESCE(p_new_start_date, v_budget.start_date);

  -- Validasi start_date tidak di masa depan
  IF v_start_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Start date (%) cannot be in the future', v_start_date;
  END IF;

  -- Tutup budget aktif user ini (selain yang akan direaktivasi)
  UPDATE budgets
  SET    end_date = CURRENT_DATE
  WHERE  user_id  = v_budget.user_id
    AND  end_date IS NULL
    AND  id      != p_budget_id;

  -- Reaktivasi: hapus end_date, terapkan start_date baru jika ada
  UPDATE budgets
  SET
    end_date   = NULL,
    start_date = v_start_date
  WHERE  id = p_budget_id
  RETURNING * INTO v_budget;

  RETURN v_budget;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reactivate_budget(UUID, DATE) TO authenticated;


-- ============================================================
-- STEP 8 — RPC: admin_get_user_expenses(p_user_id)
--
-- Return: semua transaksi user, diurutkan date DESC.
-- Digunakan di section transaksi halaman detail user admin.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_user_expenses(p_user_id UUID)
RETURNS TABLE (
  id          UUID,
  amount      NUMERIC,
  category    TEXT,
  description TEXT,
  date        DATE,
  created_at  TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN QUERY
    SELECT e.id, e.amount, e.category, e.description, e.date, e.created_at, e.updated_at
    FROM   expenses e
    WHERE  e.user_id = p_user_id
    ORDER  BY e.date DESC, e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_expenses(UUID) TO authenticated;


-- ============================================================
-- STEP 9 — RPC: admin_update_expense(...)
--
-- Edit transaksi milik user manapun.
-- Digunakan di Phase 4 — edit transaksi dari halaman detail user.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_update_expense(
  p_expense_id  UUID,
  p_amount      NUMERIC,
  p_category    TEXT,
  p_description TEXT,
  p_date        DATE
)
RETURNS expenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expense expenses;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF p_amount IS NOT NULL AND p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;

  SELECT * INTO v_expense FROM expenses WHERE id = p_expense_id;
  IF v_expense.id IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  UPDATE expenses
  SET
    amount      = COALESCE(p_amount,      amount),
    category    = COALESCE(p_category,    category),
    description = p_description,           -- boleh jadi NULL
    date        = COALESCE(p_date,        date),
    updated_at  = NOW()
  WHERE id = p_expense_id
  RETURNING * INTO v_expense;

  RETURN v_expense;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_update_expense(UUID, NUMERIC, TEXT, TEXT, DATE) TO authenticated;


-- ============================================================
-- STEP 10 — RPC: admin_delete_expense(p_expense_id)
--
-- Hapus transaksi milik user manapun.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_delete_expense(p_expense_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT EXISTS (SELECT 1 FROM expenses WHERE id = p_expense_id) INTO v_exists;
  IF NOT v_exists THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  DELETE FROM expenses WHERE id = p_expense_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_delete_expense(UUID) TO authenticated;


-- ============================================================
-- STEP 11 — RPC: admin_get_user_email(p_user_id)
--
-- Email user disimpan di auth.users, bukan di profiles.
-- Butuh SECURITY DEFINER untuk akses tabel auth.users.
-- Digunakan di header profil halaman detail user admin.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_user_email(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user_email(UUID) TO authenticated;


-- ============================================================
-- INDEXES tambahan untuk query admin
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
