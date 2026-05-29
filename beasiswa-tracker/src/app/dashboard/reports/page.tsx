import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportManager from '@/components/ReportManager';

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: reports, error }, { data: activeBudget }] = await Promise.all([
    supabase
      .from('reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('budgets')
      .select('start_date, created_at')
      .eq('user_id', user.id)
      .is('end_date', null)
      .single(),
  ]);

  if (error) {
    console.error('[Reports] Failed to fetch:', error.message);
  }

  return (
    <div className="pt-14 lg:pt-0">
      <ReportManager
        initialReports={reports ?? []}
        userId={user.id}
        activeBudgetStartDate={activeBudget?.start_date ?? null}
        activeBudgetCreatedAt={activeBudget?.created_at ?? null}
      />
    </div>
  );
}
