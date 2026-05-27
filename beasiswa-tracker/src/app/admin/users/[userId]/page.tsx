import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminUserDetail from './AdminUserDetail';
import type { AdminBudget, Expense } from '@/lib/types';

interface Props {
  params: { userId: string };
}

export default async function AdminUserPage({ params }: Props) {
  const { userId } = params;
  const supabase = createClient();

  // Fetch semua data secara parallel — tidak ada dependency antar request
  const [profileResult, emailResult, budgetsResult, expensesResult] = await Promise.all([
    supabase.from('profiles').select('full_name, university').eq('id', userId).single(),
    supabase.rpc('admin_get_user_email', { p_user_id: userId }),
    supabase.rpc('admin_get_user_budgets', { p_user_id: userId }),
    supabase.rpc('admin_get_user_expenses', { p_user_id: userId }),
  ]);

  // Profile tidak ditemukan → 404
  if (profileResult.error || !profileResult.data) notFound();

  if (budgetsResult.error)  console.error('[AdminUserPage] budgets:', budgetsResult.error.message);
  if (expensesResult.error) console.error('[AdminUserPage] expenses:', expensesResult.error.message);

  const profile = {
    full_name:  profileResult.data.full_name,
    university: profileResult.data.university,
    email:      emailResult.data ?? null,
  };

  const budgets: AdminBudget[] = budgetsResult.data ?? [];

  // RPC admin_get_user_expenses tidak include user_id — tambahkan dari URL param
  // agar kompatibel dengan tipe Expense yang dipakai ExpenseTable
  const expenses: Expense[] = (expensesResult.data ?? []).map(
    (e: Omit<Expense, 'user_id'>) => ({ ...e, user_id: userId })
  );

  return (
    <AdminUserDetail
      userId={userId}
      profile={profile}
      initialBudgets={budgets}
      initialExpenses={expenses}
    />
  );
}
