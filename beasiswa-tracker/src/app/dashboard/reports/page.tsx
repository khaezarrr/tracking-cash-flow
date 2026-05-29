import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportManager from '@/components/ReportManager';
import { type Budget } from '@/lib/types';

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: reports, error }, { data: budgets }] = await Promise.all([
    supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('budgets')
      .select('id, amount, start_date, end_date, created_at')
      .eq('user_id', user.id)
      // Active budget (end_date IS NULL) sorts first because NULL sorts last in ASC,
      // so we order DESC to flip: active (NULL end_date) comes first.
      .order('end_date', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: false }),
  ]);

  if (error) {
    console.error('[Reports] Failed to fetch:', error.message);
  }

  return (
    <div className="pt-14 lg:pt-0">
      <ReportManager
        initialReports={reports ?? []}
        userId={user.id}
        allBudgets={(budgets ?? []) as Budget[]}
      />
    </div>
  );
}
