import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseManager from '@/components/ExpenseManager';

const PAGE_SIZE = 50;

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Ambil budget aktif untuk filter tanggal
  const { data: activeBudget } = await supabase
    .from('budgets')
    .select('start_date')
    .eq('user_id', user.id)
    .is('end_date', null)
    .single();

  // Bangun query expenses
  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(PAGE_SIZE);

  // Filter hanya pengeluaran sejak start_date budget aktif
  if (activeBudget?.start_date) {
    query = query.gte('date', activeBudget.start_date);
  }

  const { data: expenses, error, count } = await query;

  if (error) {
    console.error('[Expenses] Failed to fetch:', error.message);
  }

  return (
    <div className="pt-14 lg:pt-0">
      <ExpenseManager
        initialExpenses={expenses ?? []}
        userId={user.id}
        totalCount={count ?? 0}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
