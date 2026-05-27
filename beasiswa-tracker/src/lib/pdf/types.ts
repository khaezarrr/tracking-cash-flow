// Data shape disiapkan oleh server component, dikonsumsi oleh generatePDF di browser.
// Semua nilai numerik raw — formatting dilakukan di generatePDF.

export interface CategoryRow {
  name: string;
  count: number;
  amount: number; // raw, diformat di generatePDF
  pct: number;    // 0–100
}

export interface MonthRow {
  label: string;  // sudah diformat: "Januari 2024"
  amount: number; // raw
}

export interface TransactionRow {
  no: number;
  date: string;        // sudah diformat: "1 Jan 2024"
  description: string; // description ?? category
  category: string;
  amount: number;      // raw
}

export interface BudgetSummary {
  amount: number;    // raw
  usedPct: number;   // 0–100+
  remaining: number; // raw, bisa negatif
}

export interface ReportPDFData {
  // Metadata laporan
  title: string;
  dateFrom: string;    // formatted: "1 Januari 2024"
  dateTo: string;      // formatted
  dateFromRaw: string; // YYYY-MM-DD — untuk nama file
  dateToRaw: string;   // YYYY-MM-DD — untuk nama file
  generatedAt: string; // formatted: "25 Mei 2026 pukul 14.00"

  // User
  userName: string;
  university: string;

  // Totals
  totalExpenses: number;
  totalTransactions: number;

  // Budget — null jika tidak ada
  budget: BudgetSummary | null;

  // Breakdown
  byCategory: CategoryRow[];
  byMonth: MonthRow[];
  transactions: TransactionRow[];
}
