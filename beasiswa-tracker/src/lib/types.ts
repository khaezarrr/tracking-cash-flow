export type Category =
  | 'Makan & Minum'
  | 'Transportasi'
  | 'Pendidikan'
  | 'Kesehatan'
  | 'Kebutuhan Pribadi'
  | 'Hiburan'
  | 'Tabungan'
  | 'Lainnya';

export const CATEGORIES: Category[] = [
  'Makan & Minum',
  'Transportasi',
  'Pendidikan',
  'Kesehatan',
  'Kebutuhan Pribadi',
  'Hiburan',
  'Tabungan',
  'Lainnya',
];

export const CATEGORY_COLORS: Record<Category, string> = {
  'Makan & Minum':      '#22c55e',
  'Transportasi':       '#3b82f6',
  'Pendidikan':         '#8b5cf6',
  'Kesehatan':          '#ef4444',
  'Kebutuhan Pribadi':  '#f59e0b',
  'Hiburan':            '#ec4899',
  'Tabungan':           '#14b8a6',
  'Lainnya':            '#6b7280',
};

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  title: string;
  date_from: string;
  date_to: string;
  token: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  university: string | null;
  created_at: string;
}

// Admin — budget history dari RPC admin_get_user_budgets()
export interface AdminBudget {
  id:         string;
  amount:     number;
  start_date: string;
  end_date:   string | null;
  created_at: string;
}

// Admin — return shape dari RPC get_all_users_summary()
// total_expenses dan remaining NULL jika user tidak punya budget aktif
export interface UserSummary {
  user_id:        string;
  full_name:      string | null;
  university:     string | null;
  budget_id:      string | null;
  budget_amount:  number | null;
  budget_start:   string | null;
  total_expenses: number | null;
  remaining:      number | null;
}

// Phase 2 — Budget type
export interface Budget {
  id: string;
  user_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;   // NULL = budget sedang aktif
  created_at: string;
}
