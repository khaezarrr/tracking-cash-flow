import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ReportManager from '@/components/ReportManager';

export default async function ReportsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fix #1: explicit null check
  if (!user) redirect('/login');

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fix #2: explicit error handling
  if (error) {
    console.error('[Reports] Failed to fetch:', error.message);
  }

  return (
    <div className="pt-14 lg:pt-0">
      <ReportManager initialReports={reports ?? []} userId={user.id} />
    </div>
  );
}
