import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/settings/ProfileForm';
import BudgetSection from '@/components/settings/BudgetSection';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: budgets }] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, university')
      .eq('id', user.id)
      .single(),
    supabase
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false }),
  ]);

  return (
    <div className="space-y-6 pt-14 lg:pt-0 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola profil dan budget beasiswamu</p>
      </div>

      <ProfileForm
        userId={user.id}
        initialName={profile?.full_name ?? null}
        initialUniversity={profile?.university ?? null}
      />

      <BudgetSection initialBudgets={budgets ?? []} />
    </div>
  );
}
