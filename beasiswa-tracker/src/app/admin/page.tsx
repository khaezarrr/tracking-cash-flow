import { createClient } from '@/lib/supabase/server';
import AdminUserTable from './AdminUserTable';
import type { UserSummary } from '@/lib/types';

export default async function AdminPage() {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_all_users_summary');

  if (error) {
    console.error('[Admin] get_all_users_summary:', error.message);
  }

  const users: UserSummary[] = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
        <p className="text-gray-500 text-sm mt-1">
          {users.length} user terdaftar
        </p>
      </div>

      <AdminUserTable users={users} />
    </div>
  );
}
