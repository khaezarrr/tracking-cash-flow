import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatRupiah, formatDateShort } from '@/lib/utils';
import { CATEGORY_COLORS, type Category, type Budget } from '@/lib/types';
import { TrendingDown, Wallet, Tag, Calendar, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function daysBetween(from: Date, to: Date): number {
  return Math.max(1, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
}

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: budget, error: budgetError } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .is('end_date', null)
    .single();

  if (budgetError && budgetError.code !== 'PGRST116') {
    console.error('[Dashboard] budget fetch:', budgetError.message);
  }

  const activeBudget = budget as Budget | null;

  const expensesQuery = supabase
    .from('expenses')
    .select('id, amount, category, description, date, created_at')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(500);

  if (activeBudget) {
    expensesQuery.gte('created_at', activeBudget.created_at);
  }

  const { data: expensesData, error: expensesError } = await expensesQuery;

  if (expensesError) console.error('[Dashboard] expenses fetch:', expensesError.message);

  const expenses   = expensesData ?? [];
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);

  const thisMonth      = new Date().toISOString().slice(0, 7);
  const thisMonthTotal = expenses
    .filter(e => e.date.startsWith(thisMonth))
    .reduce((s, e) => s + e.amount, 0);

  let budgetCalc: {
    spentInBudget: number;
    remaining: number;
    remainingPct: number;
    dailyAvg: number;
    projectedDate: Date | null;
    isCritical: boolean;
  } | null = null;

  if (activeBudget) {
    const spentInBudget  = totalSpent;
    const remaining      = activeBudget.amount - spentInBudget;
    const remainingPct   = Math.max(0, (remaining / activeBudget.amount) * 100);
    const today          = new Date();
    const startDate      = new Date(activeBudget.start_date);
    const daysSinceStart = daysBetween(startDate, today);
    const dailyAvg       = spentInBudget / daysSinceStart;

    let projectedDate: Date | null = null;
    if (dailyAvg > 0 && remaining > 0) {
      const daysLeft = Math.floor(remaining / dailyAvg);
      projectedDate  = new Date(today);
      projectedDate.setDate(today.getDate() + daysLeft);
    } else if (remaining <= 0) {
      projectedDate = new Date();
    }

    budgetCalc = {
      spentInBudget,
      remaining,
      remainingPct,
      dailyAvg,
      projectedDate,
      isCritical: remainingPct < 20,
    };
  }

  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount; });
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recentExpenses   = expenses.slice(0, 5);

  return (
    <div className="space-y-6 pt-14 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {activeBudget
            ? `Periode budget: mulai ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(activeBudget.start_date))}`
            : 'Ringkasan pengeluaran beasiswamu'
          }
        </p>
      </div>

      {!activeBudget && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-amber-800">
              <strong>Belum ada budget aktif.</strong> Setup budget beasiswamu agar bisa memantau sisa dana dan proyeksi pengeluaran.
            </p>
          </div>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 flex-shrink-0"
            aria-label="Pergi ke pengaturan untuk setup budget"
          >
            Setup <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Wallet className="w-5 h-5 text-brand-600" aria-hidden="true" />}
          label="Total Pengeluaran"
          value={formatRupiah(totalSpent)}
          bg="bg-brand-50"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5 text-blue-600" aria-hidden="true" />}
          label="Bulan Ini"
          value={formatRupiah(thisMonthTotal)}
          bg="bg-blue-50"
        />
        <StatCard
          icon={<Tag className="w-5 h-5 text-purple-600" aria-hidden="true" />}
          label="Total Transaksi"
          value={`${expenses.length} transaksi`}
          bg="bg-purple-50"
        />
      </div>

      {activeBudget && budgetCalc && (
        <BudgetCard budget={activeBudget} calc={budgetCalc} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pengeluaran per Kategori</h2>
          {sortedCategories.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada data pengeluaran.</p>
          ) : (
            <div className="space-y-3" role="list" aria-label="Pengeluaran per kategori">
              {sortedCategories.map(([cat, amount]) => {
                const pct   = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                const color = CATEGORY_COLORS[cat as Category] ?? '#6b7280';
                return (
                  <div key={cat} role="listitem">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat}</span>
                      <span className="font-medium text-gray-900">{formatRupiah(amount)}</span>
                    </div>
                    <div
                      className="h-2 bg-gray-100 rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${cat}: ${Math.round(pct)}%`}
                    >
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Transaksi Terbaru</h2>
            <Link href="/dashboard/expenses" className="text-brand-600 text-sm hover:underline">
              Lihat semua
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada transaksi.</p>
          ) : (
            <div className="space-y-3" role="list" aria-label="Transaksi terbaru">
              {recentExpenses.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-2" role="listitem">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: CATEGORY_COLORS[e.category as Category] ?? '#6b7280' }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.description || e.category}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" aria-hidden="true" />
                        <time dateTime={e.date}>{formatDateShort(e.date)}</time>
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                    {formatRupiah(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BudgetCard({ budget, calc }: {
  budget: Budget;
  calc: {
    spentInBudget: number; remaining: number; remainingPct: number;
    dailyAvg: number; projectedDate: Date | null; isCritical: boolean;
  };
}) {
  const { spentInBudget, remaining, remainingPct, dailyAvg, projectedDate, isCritical } = calc;

  const barColor = isCritical ? 'bg-red-500' : remainingPct < 50 ? 'bg-amber-400' : 'bg-brand-500';

  const projectionText = (() => {
    if (!projectedDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (projectedDate <= today) return 'Dana sudah habis.';
    return `Dengan rata-rata pengeluaran harian ${formatRupiah(Math.round(dailyAvg))}, dana diperkirakan habis pada ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(projectedDate)}.`;
  })();

  return (
    <div className={`card p-5 ${isCritical ? 'border-red-200 bg-red-50/30' : ''}`}
      role="region" aria-label="Status budget beasiswa">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-brand-600" aria-hidden="true" />
          Saldo Tersisa
        </h2>
        <span className="text-xs text-gray-400">Budget: {formatRupiah(budget.amount)}</span>
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <p className={`text-2xl font-bold ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
            {formatRupiah(Math.max(0, remaining))}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            Terpakai: {formatRupiah(spentInBudget)} ({(100 - remainingPct).toFixed(1)}%)
          </p>
        </div>
        <p className={`text-lg font-bold ${isCritical ? 'text-red-600' : 'text-gray-700'}`}>
          {remainingPct.toFixed(1)}%
        </p>
      </div>

      <div
        className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3"
        role="progressbar"
        aria-valuenow={Math.round(remainingPct)}
        aria-valuemin={0} aria-valuemax={100}
        aria-label={`Saldo tersisa ${remainingPct.toFixed(1)}%`}
      >
        <div className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.max(0, remainingPct)}%` }} />
      </div>

      {projectionText && (
        <p className={`text-xs mt-2 ${isCritical ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {projectionText}
        </p>
      )}

      {isCritical && remaining > 0 && (
        <div className="mt-3 flex items-start gap-2 bg-red-100 border border-red-200 rounded-lg px-3 py-2" role="alert">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-red-700 font-medium">
            Saldo tersisa kurang dari 20%! Pertimbangkan untuk mengurangi pengeluaran.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: string; bg: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`} aria-hidden="true">{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900" aria-label={`${label}: ${value}`}>{value}</p>
    </div>
  );
}
