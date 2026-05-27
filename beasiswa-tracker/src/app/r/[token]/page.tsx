import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { formatRupiah, formatDate, formatDateShort } from '@/lib/utils';
import { CATEGORY_COLORS, type Category } from '@/lib/types';
import { BookOpen, Calendar, Tag, TrendingDown, Wallet } from 'lucide-react';
import ExportPDFButton from '@/components/ExportPDFButton';
import type { ReportPDFData, CategoryRow, MonthRow, TransactionRow } from '@/lib/pdf/types';

interface Props {
  params: { token: string };
}

interface PublicExpense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
}

interface PublicBudget {
  budget_amount: number;
  start_date: string;
  end_date: string | null;
}

// ─── Build ReportPDFData dari data yang sudah difetch ────────────────────────
function buildReportData(params: {
  report: { title: string; date_from: string; date_to: string };
  profile: { full_name: string | null; university: string | null } | null;
  expenses: PublicExpense[];
  budget: PublicBudget | null;
  totalExpenses: number;
  budgetUsedPct: number | null;
  budgetRemaining: number | null;
  sortedCats: [string, number][];
}): ReportPDFData {
  const { report, profile, expenses, budget, totalExpenses, budgetUsedPct, budgetRemaining, sortedCats } = params;

  const catCount: Record<string, number> = {};
  expenses.forEach(e => { catCount[e.category] = (catCount[e.category] ?? 0) + 1; });

  const byCategory: CategoryRow[] = sortedCats.map(([name, amount]) => ({
    name,
    count: catCount[name] ?? 0,
    amount,
    pct: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
  }));

  const monthMap: Record<string, number> = {};
  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    monthMap[key] = (monthMap[key] ?? 0) + e.amount;
  });
  const byMonth: MonthRow[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({
      label: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
        .format(new Date(key + '-01')),
      amount,
    }));

  const transactions: TransactionRow[] = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({
      no: i + 1,
      date: formatDateShort(e.date),
      description: e.description || e.category,
      category: e.category,
      amount: e.amount,
    }));

  const generatedAt = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date()).replace(',', ' pukul');

  return {
    title: report.title,
    dateFrom: formatDate(report.date_from),
    dateTo: formatDate(report.date_to),
    dateFromRaw: report.date_from,
    dateToRaw: report.date_to,
    generatedAt,
    userName: profile?.full_name || '',
    university: profile?.university || '',
    totalExpenses,
    totalTransactions: expenses.length,
    budget: budget && budgetUsedPct !== null && budgetRemaining !== null
      ? { amount: budget.budget_amount, usedPct: budgetUsedPct, remaining: budgetRemaining }
      : null,
    byCategory,
    byMonth,
    transactions,
  };
}

export default async function PublicReportPage({ params }: Props) {
  const supabase = createClient();

  const { data: report } = await supabase
    .from('reports')
    .select('*')
    .eq('token', params.token)
    .single();

  if (!report) notFound();

  // Fetch expenses + budget in parallel via SECURITY DEFINER RPCs
  const [expensesResult, budgetResult, profileResult] = await Promise.all([
    supabase.rpc('get_public_report_expenses', { report_token: params.token }),
    supabase.rpc('get_public_report_budget',   { report_token: params.token }),
    supabase.from('profiles').select('full_name, university').eq('id', report.user_id).single(),
  ]);

  if (expensesResult.error) console.error('[PublicReport] expenses RPC:', expensesResult.error.message);
  if (budgetResult.error)   console.error('[PublicReport] budget RPC:',   budgetResult.error.message);

  const expenses: PublicExpense[] = expensesResult.data ?? [];
  const budget: PublicBudget | null =
    budgetResult.data && budgetResult.data.length > 0 ? budgetResult.data[0] : null;
  const profile = profileResult.data;

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  // Budget calculations (hanya jika ada budget yang overlap dengan laporan)
  const budgetUsedPct   = budget ? Math.min(100, (totalExpenses / budget.budget_amount) * 100) : null;
  const budgetRemaining = budget ? budget.budget_amount - totalExpenses : null;

  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount; });
  const sortedCats = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  // Build PDF data di server — dikirim ke client component sebagai props
  const pdfData: ReportPDFData | null = expenses.length > 0
    ? buildReportData({ report, profile, expenses, budget, totalExpenses, budgetUsedPct, budgetRemaining, sortedCats })
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center" aria-hidden="true">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">Beasiswa Tracker</span>
            <span className="text-gray-400 text-sm ml-2">· Laporan Publik</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Report header */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{report.title}</h1>
              {profile && (
                <p className="text-gray-500 text-sm mt-1">
                  {profile.full_name}{profile.university && ` · ${profile.university}`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                <Calendar className="w-4 h-4" aria-hidden="true" />
                <time dateTime={report.date_from}>{formatDate(report.date_from)}</time>
                <span aria-hidden="true">—</span>
                <time dateTime={report.date_to}>{formatDate(report.date_to)}</time>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(totalExpenses)}</p>
                <p className="text-xs text-gray-400 mt-1">{expenses.length} transaksi</p>
              </div>
              {/* Tombol Export PDF — hanya muncul jika ada data */}
              {pdfData && <ExportPDFButton data={pdfData} />}
            </div>
          </div>
        </div>

        {/* Phase 4 — Budget summary (tampil jika ada budget yang overlap) */}
        {budget && budgetUsedPct !== null && budgetRemaining !== null && (
          <div className="card p-5" role="region" aria-label="Ringkasan budget">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Wallet className="w-4 h-4" aria-hidden="true" />
              Ringkasan Budget
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <BudgetStat label="Total Dana"         value={formatRupiah(budget.budget_amount)} />
              <BudgetStat label="Total Pengeluaran"  value={formatRupiah(totalExpenses)} />
              <BudgetStat
                label="Saldo Tersisa"
                value={formatRupiah(Math.max(0, budgetRemaining))}
                highlight={budgetRemaining < 0}
              />
              <BudgetStat label="Persentase Terpakai" value={`${budgetUsedPct.toFixed(1)}%`} />
            </div>

            {/* Progress bar */}
            <div
              className="h-2.5 bg-gray-100 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(budgetUsedPct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${budgetUsedPct.toFixed(1)}% dana terpakai`}
            >
              <div
                className={`h-full rounded-full ${
                  budgetUsedPct >= 80 ? 'bg-red-500' : budgetUsedPct >= 50 ? 'bg-amber-400' : 'bg-brand-500'
                }`}
                style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
              />
            </div>
          </div>
        )}

        {/* Kategori */}
        {sortedCats.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Tag className="w-4 h-4" aria-hidden="true" />
              Ringkasan per Kategori
            </h2>
            <div className="space-y-3" role="list">
              {sortedCats.map(([cat, amount]) => {
                const pct   = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                const color = CATEGORY_COLORS[cat as Category] ?? '#6b7280';
                return (
                  <div key={cat} role="listitem">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{cat}</span>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">{formatRupiah(amount)}</span>
                        <span className="text-gray-400 ml-2 text-xs">{pct.toFixed(1)}%</span>
                      </div>
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
          </div>
        )}

        {/* Transaksi */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
            <h2 className="font-semibold text-gray-900">Detail Transaksi</h2>
          </div>
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-gray-400" role="status">
              Tidak ada transaksi dalam periode ini.
            </div>
          ) : (
            <div className="divide-y divide-gray-50" role="list" aria-label="Daftar transaksi">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center justify-between gap-4 px-5 py-3.5" role="listitem">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[e.category as Category] ?? '#6b7280' }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {e.description || e.category}
                      </p>
                      <p className="text-xs text-gray-400">
                        <time dateTime={e.date}>{formatDateShort(e.date)}</time> · {e.category}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 text-sm flex-shrink-0">
                    {formatRupiah(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Laporan ini dibuat dengan Beasiswa Tracker · Hanya bisa dibaca
        </p>
      </main>
    </div>
  );
}

function BudgetStat({
  label, value, highlight = false,
}: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold text-sm ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
