import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseManager from '@/components/ExpenseManager';

const PAGE_SIZE = 50;

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Ambil semua budget untuk cari next budget start_date
  const { data: allBudgets } = await supabase
    .from('budgets')
    .select('id, start_date, end_date, created_at')
    .eq('user_id', user.id)
    .order('start_date', { ascending: true });

  const activeBudget = allBudgets?.find(b => b.end_date === null) ?? null;

  // Cari budget berikutnya setelah budget aktif
  const nextBudget = activeBudget
    ? allBudgets?.find(b => b.start_date > activeBudget.start_date) ?? null
    : null;

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (activeBudget?.start_date) {
    query = query.gte('date', activeBudget.start_date);
  }

  // Tambah upper bound dari next budget
  if (nextBudget?.start_date) {
    query = query.lt('date', nextBudget.start_date);
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
        activeBudgetStartDate={activeBudget?.start_date ?? null}
        nextBudgetStartDate={nextBudget?.start_date ?? null}
      />
    </div>
  );
}
