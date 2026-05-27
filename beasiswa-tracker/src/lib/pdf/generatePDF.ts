// Browser-only. Di-import secara dynamic oleh ExportPDFButton saat tombol diklik.
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportPDFData } from './types';

// ─── Formatting helpers ───────────────────────────────────────────────────────
function rupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function pctStr(n: number): string {
  return `${Math.min(n, 999).toFixed(1)}%`;
}

// ─── Warna ────────────────────────────────────────────────────────────────────
const COLOR = {
  brand:   [37, 99, 235]   as [number, number, number],
  gray900: [17, 24, 39]    as [number, number, number],
  gray500: [107, 114, 128] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  red:     [239, 68, 68]   as [number, number, number],
  white:   [255, 255, 255] as [number, number, number],
} as const;

// ─── Fix #1: proper type — import jsPDF di top level, pakai typeof ────────────
type Doc = InstanceType<typeof jsPDF>;

// ─── Fix #2: helper untuk baca finalY — hilangkan 3x cast duplikat ───────────
function finalY(doc: Doc): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

// ─── Default styles untuk semua autoTable ────────────────────────────────────
function tableDefaults() {
  return {
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      textColor: COLOR.gray900,
    },
    headStyles: {
      fillColor: COLOR.brand,
      textColor: COLOR.white,
      fontStyle: 'bold' as const,
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: COLOR.gray100,
    },
    margin: { left: 14, right: 14 },
  };
}

// ─── Section title + garis pemisah ───────────────────────────────────────────
function sectionTitle(doc: Doc, title: string, y: number): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLOR.gray900);
  doc.text(title, 14, y);
  doc.setDrawColor(...COLOR.gray100);
  doc.line(14, y + 1.5, 196, y + 1.5);
  return y + 7;
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function generatePDF(data: ReportPDFData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ─── Header halaman pertama ─────────────────────────────────────────────
  doc.setFillColor(...COLOR.brand);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR.white);
  doc.text('Beasiswa Tracker', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Laporan ini digenerate otomatis oleh sistem pada ${data.generatedAt}`, 14, 18);
  doc.text('Hanya bisa dibaca — bukan dokumen resmi', 14, 23);

  let y = 36;

  // ─── Info laporan ───────────────────────────────────────────────────────
  y = sectionTitle(doc, 'Informasi Laporan', y);

  autoTable(doc, {
    ...tableDefaults(),
    startY: y,
    body: [
      ['Judul Laporan',    data.title],
      ['Nama',             data.userName || '-'],
      ['Universitas',      data.university || '-'],
      ['Periode',          `${data.dateFrom} — ${data.dateTo}`],
      ['Total Transaksi',  `${data.totalTransactions} transaksi`],
      ['Total Pengeluaran', rupiah(data.totalExpenses)],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: COLOR.gray500 },
      1: { cellWidth: 'auto' },
    },
    theme: 'plain',
  });

  y = finalY(doc) + 10;

  // ─── Ringkasan budget ───────────────────────────────────────────────────
  if (data.budget) {
    const { amount, usedPct, remaining } = data.budget;
    y = sectionTitle(doc, 'Ringkasan Budget', y);

    autoTable(doc, {
      ...tableDefaults(),
      startY: y,
      body: [
        ['Total Dana',          rupiah(amount)],
        ['Total Pengeluaran',   rupiah(data.totalExpenses)],
        ['Saldo Tersisa',       rupiah(Math.max(0, remaining))],
        ['Persentase Terpakai', pctStr(usedPct)],
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50, textColor: COLOR.gray500 },
        1: { cellWidth: 'auto' },
      },
      theme: 'plain',
    });

    if (remaining < 0) {
      const warningY = finalY(doc) + 3;
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...COLOR.red);
      doc.text(`* Pengeluaran melebihi budget sebesar ${rupiah(Math.abs(remaining))}`, 14, warningY);
    }

    y = finalY(doc) + 12;
  }

  // ─── Ringkasan per kategori ─────────────────────────────────────────────
  if (data.byCategory.length > 0) {
    y = sectionTitle(doc, 'Ringkasan per Kategori', y);

    autoTable(doc, {
      ...tableDefaults(),
      startY: y,
      head: [['Kategori', 'Jml Transaksi', 'Total', 'Persentase']],
      body: data.byCategory.map(c => [
        c.name,
        `${c.count} transaksi`,
        rupiah(c.amount),
        pctStr(c.pct),
      ]),
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
      },
    });

    y = finalY(doc) + 10;
  }

  // ─── Pengeluaran per bulan ──────────────────────────────────────────────
  if (data.byMonth.length > 0) {
    y = sectionTitle(doc, 'Pengeluaran per Bulan', y);

    autoTable(doc, {
      ...tableDefaults(),
      startY: y,
      head: [['Bulan', 'Total Pengeluaran']],
      body: data.byMonth.map(m => [m.label, rupiah(m.amount)]),
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 80, halign: 'right' },
      },
    });

    y = finalY(doc) + 10;
  }

  // ─── Tabel transaksi lengkap ────────────────────────────────────────────
  if (data.transactions.length > 0) {
    if (y > 197) { doc.addPage(); y = 20; } // halaman baru jika sisa < 50mm

    y = sectionTitle(doc, 'Detail Transaksi', y);

    // Fix #3: hapus didDrawPage no-op — autoTable handles page breaks natively
    autoTable(doc, {
      ...tableDefaults(),
      startY: y,
      head: [['No', 'Tanggal', 'Deskripsi', 'Kategori', 'Nominal']],
      body: data.transactions.map(t => [
        t.no,
        t.date,
        t.description,
        t.category,
        rupiah(t.amount),
      ]),
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 28 },
        2: { cellWidth: 60 },
        3: { cellWidth: 42 },
        4: { cellWidth: 36, halign: 'right' },
      },
    });
  }

  // ─── Footer nomor halaman ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.gray500);
    doc.text(
      `Halaman ${i} dari ${totalPages}  ·  Beasiswa Tracker`,
      105, 290,
      { align: 'center' },
    );
  }

  // ─── Nama file & simpan ─────────────────────────────────────────────────
  const safeName = (data.userName || 'laporan')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  doc.save(`laporan-${safeName}-${data.dateFromRaw}-${data.dateToRaw}.pdf`);
}
