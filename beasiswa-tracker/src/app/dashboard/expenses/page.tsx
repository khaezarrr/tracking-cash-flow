import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ExpenseManager from '@/components/ExpenseManager';

const PAGE_SIZE = 50;

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fix #1: explicit null check
  if (!user) redirect('/login');

  // Fix #3: server-side limit, tidak ambil semua sekaligus
  const { data: expenses, error, count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(PAGE_SIZE);

  // Fix #2: explicit error handling
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
