import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, university')
    .eq('id', user.id)
    .single();

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} profile={profile} />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
