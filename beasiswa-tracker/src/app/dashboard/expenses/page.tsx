import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseManager from '@/components/ExpenseManager';

const PAGE_SIZE = 50;

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: activeBudget } = await supabase
    .from('budgets')
    .select('start_date, created_at')
    .eq('user_id', user.id)
    .is('end_date', null)
    .single();

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  // Filter pakai created_at budget — lebih akurat dari start_date
  if (activeBudget?.created_at) {
    query = query.gte('created_at', activeBudget.created_at);
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
        activeBudgetStartDate={activeBudget?.created_at ?? null}
      />
    </div>
  );
}
