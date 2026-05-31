import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminUserDetail from './AdminUserDetail';
import type { AdminBudget } from '@/lib/types';

interface Props {
  params: { userId: string };
}

export default async function AdminUserPage({ params }: Props) {
  const { userId } = params;
  const supabase = createClient();

  const [profileResult, emailResult, budgetsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, university').eq('id', userId).single(),
    supabase.rpc('admin_get_user_email', { p_user_id: userId }),
    supabase.rpc('admin_get_user_budgets', { p_user_id: userId }),
  ]);

  if (profileResult.error || !profileResult.data) notFound();

  if (budgetsResult.error) console.error('[AdminUserPage] budgets:', budgetsResult.error.message);

  const profile = {
    full_name:  profileResult.data.full_name,
    university: profileResult.data.university,
    email:      emailResult.data ?? null,
  };

  const budgets: AdminBudget[] = budgetsResult.data ?? [];

  return (
    <AdminUserDetail
      userId={userId}
      profile={profile}
      initialBudgets={budgets}
    />
  );
}
