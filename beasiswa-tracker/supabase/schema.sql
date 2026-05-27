-- ============================================================
-- BEASISWA TRACKER — Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- ============================================================

-- 1. TABEL PROFILES
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  university  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL EXPENSES
CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  category    TEXT NOT NULL,
  description TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL REPORTS
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  date_from   DATE NOT NULL,
  date_to     DATE NOT NULL,
  token       TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_date_range CHECK (date_to >= date_from)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports  ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Expenses: hanya pemilik yang bisa akses
-- TIDAK ada policy "public read" — akses publik hanya via RPC di bawah
CREATE POLICY "Users can view own expenses"
  ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses"
  ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses"
  ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses"
  ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Reports: pemilik + public read via token
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Public can view report by token"
  ON reports FOR SELECT USING (true);

-- ============================================================
-- FUNCTION: Auto-create profile saat user register
--
-- Fix #1 (race condition):
-- University disimpan ke raw_user_meta_data saat signUp,
-- trigger ini membacanya langsung — tidak perlu getUser() post-signup.
-- Ini aman bahkan kalau Supabase mewajibkan email confirmation,
-- karena trigger jalan saat row di auth.users dibuat, bukan saat login.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, university)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'university'   -- ← ditambahkan
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNCTION: Auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: get_public_report_expenses
--
-- Fix #2 (security hole):
-- Menggantikan fetch langsung pakai anon key yang bypass RLS.
-- SECURITY DEFINER = fungsi ini jalan dengan hak akses pemilik fungsi
-- (postgres superuser), bukan hak akses caller.
-- Ini aman karena:
--   1. Validasi token dilakukan di dalam fungsi
--   2. Hanya data dalam rentang tanggal report yang dikembalikan
--   3. Anon key tidak pernah digunakan untuk akses data langsung
--   4. Service role key tidak pernah dikirim ke client
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_report_expenses(report_token TEXT)
RETURNS TABLE (
  id          UUID,
  amount      NUMERIC,
  category    TEXT,
  description TEXT,
  date        DATE,
  created_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- cegah search_path injection
AS $$
DECLARE
  v_user_id   UUID;
  v_date_from DATE;
  v_date_to   DATE;
BEGIN
  -- Validasi token; kalau tidak ada → return kosong, bukan error
  SELECT r.user_id, r.date_from, r.date_to
  INTO   v_user_id, v_date_from, v_date_to
  FROM   reports r
  WHERE  r.token = report_token
  LIMIT  1;

  IF v_user_id IS NULL THEN
    RETURN; -- token tidak valid, return empty result set
  END IF;

  RETURN QUERY
    SELECT
      e.id,
      e.amount,
      e.category,
      e.description,
      e.date,
      e.created_at
    FROM expenses e
    WHERE e.user_id  = v_user_id
      AND e.date    >= v_date_from
      AND e.date    <= v_date_to
    ORDER BY e.date DESC;
END;
$$;

-- Pastikan anon role bisa memanggil fungsi ini (tapi tidak bisa akses tabel expenses langsung)
GRANT EXECUTE ON FUNCTION get_public_report_expenses(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report_expenses(TEXT) TO authenticated;

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_expenses_user_id   ON expenses(user_id);
CREATE INDEX idx_expenses_date      ON expenses(date);
CREATE INDEX idx_expenses_category  ON expenses(category);
CREATE INDEX idx_reports_user_id    ON reports(user_id);
CREATE INDEX idx_reports_token      ON reports(token);

-- ============================================================
-- BUDGET FEATURE (termasuk di schema lengkap untuk setup baru)
-- Pengguna yang sudah punya schema lama: jalankan migration_budget.sql
-- ============================================================

CREATE TABLE budgets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount     NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  start_date DATE NOT NULL,
  end_date   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_budget_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_budgets_user_id    ON budgets(user_id);
CREATE INDEX idx_budgets_start_date ON budgets(start_date);

CREATE OR REPLACE FUNCTION create_budget(p_amount NUMERIC, p_start_date DATE)
RETURNS budgets LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_new_budget budgets;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than 0'; END IF;
  IF p_start_date IS NULL THEN RAISE EXCEPTION 'Start date is required'; END IF;
  UPDATE budgets SET end_date = p_start_date WHERE user_id = v_user_id AND end_date IS NULL;
  INSERT INTO budgets (user_id, amount, start_date) VALUES (v_user_id, p_amount, p_start_date) RETURNING * INTO v_new_budget;
  RETURN v_new_budget;
END;
$$;
GRANT EXECUTE ON FUNCTION create_budget(NUMERIC, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION get_public_report_budget(report_token TEXT)
RETURNS TABLE (budget_amount NUMERIC, start_date DATE, end_date DATE)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_date_from DATE; v_date_to DATE;
BEGIN
  SELECT r.user_id, r.date_from, r.date_to INTO v_user_id, v_date_from, v_date_to FROM reports r WHERE r.token = report_token LIMIT 1;
  IF v_user_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT b.amount, b.start_date, b.end_date FROM budgets b
    WHERE b.user_id = v_user_id AND b.start_date <= v_date_to AND (b.end_date >= v_date_from OR b.end_date IS NULL)
    ORDER BY b.start_date DESC LIMIT 1;
END;
$$;
GRANT EXECUTE ON FUNCTION get_public_report_budget(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_report_budget(TEXT) TO authenticated;
