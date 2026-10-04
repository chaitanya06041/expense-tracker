import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { CATEGORY_COLORS, type Expense } from '../types';
import { loadExpensesForMonth } from '../utils/storage';

interface Props {
  open: boolean;
  onClose: () => void;
  /** "YYYY-MM" — data is fetched on open */
  yearMonth: string;
}

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: Expense[]): string {
  const header = ['Date', 'Category', 'Amount (₹)', 'Note'];
  return [
    header.join(','),
    ...rows.map((e) =>
      [e.date, e.category, e.amount.toFixed(2), e.note ?? ''].map(escapeCSV).join(',')
    ),
  ].join('\n');
}

function toXLSX(rows: Expense[]): Blob {
  const header = ['Date', 'Category', 'Amount (₹)', 'Note'];
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cell = (v: string | number, type: 'String' | 'Number' = 'String') =>
    type === 'Number'
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${xmlEscape(String(v))}</Data></Cell>`;
  const headerRow = `<Row>${header.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows
    .map((e) => `<Row>${cell(e.date)}${cell(e.category)}${cell(e.amount, 'Number')}${cell(e.note ?? '')}</Row>`)
    .join('');
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Expenses">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
  return new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ExportModal: React.FC<Props> = ({ open, onClose, yearMonth }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch this month's data the first time the modal opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadExpensesForMonth(yearMonth).then((data) => {
      setExpenses(data);
      setLoading(false);
    });
  }, [open, yearMonth]);

  const label = dayjs(yearMonth + '-01').format('MMMM YYYY');
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const filename = `expenses_${yearMonth}`;
    if (format === 'csv') {
      triggerDownload(new Blob([toCSV(expenses)], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`);
    } else {
      triggerDownload(toXLSX(expenses), `${filename}.xls`);
    }
    onClose();
  };

  // Category breakdown for preview
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl max-h-[80dvh] flex flex-col overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Export — {label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${expenses.length} expenses · ₹${total.toFixed(2)}`}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Category breakdown preview */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin text-indigo-400" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No expenses for {label}.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(byCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, amt]) => (
                  <div key={cat} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS] ?? '#999' }}
                      />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">₹{amt.toFixed(2)}</span>
                  </div>
                ))}
              <div className="border-t border-gray-100 mt-1 pt-2 flex justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Total</span>
                <span className="text-sm font-bold text-indigo-700">₹{total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={loading || expenses.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition shadow-md shadow-indigo-200"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={loading || expenses.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-emerald-700 font-semibold py-3 rounded-xl transition border border-emerald-300"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export as Excel (.xls)
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportModal;
