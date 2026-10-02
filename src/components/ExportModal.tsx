import React, { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { ALL_CATEGORIES, CATEGORY_COLORS, type Category, type Expense } from '../types';
import CategoryChip from './CategoryChip';

interface Props {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  /** Pre-fill from current page filters */
  initialFrom?: string;
  initialTo?: string;
  initialCats?: Category[];
}

type QuickRange = 'today' | '7d' | '30d' | 'all' | 'custom';

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
];

function quickBounds(r: QuickRange): { start: string; end: string } {
  const today = dayjs();
  const end = today.format('YYYY-MM-DD');
  switch (r) {
    case 'today':  return { start: end, end };
    case '7d':     return { start: today.subtract(6,  'day').format('YYYY-MM-DD'), end };
    case '30d':    return { start: today.subtract(29, 'day').format('YYYY-MM-DD'), end };
    case 'all':    return { start: '2000-01-01', end };
    case 'custom': return { start: '', end: '' };
  }
}

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows: Expense[]): string {
  const header = ['Date', 'Category', 'Amount (₹)', 'Note'];
  const lines = [
    header.join(','),
    ...rows.map((e) =>
      [e.date, e.category, e.amount.toFixed(2), e.note ?? ''].map(escapeCSV).join(',')
    ),
  ];
  return lines.join('\n');
}

/** Minimal XLSX writer — produces a valid .xlsx without any dependency */
function toXLSX(rows: Expense[]): Blob {
  // Build a simple tab-separated values wrapped in an XLSX-compatible XML
  // We use the SpreadsheetML (XML) format which Excel/Sheets open natively
  const header = ['Date', 'Category', 'Amount (₹)', 'Note'];

  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const cell = (v: string | number, type: 'String' | 'Number' = 'String') =>
    type === 'Number'
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${xmlEscape(String(v))}</Data></Cell>`;

  const headerRow = `<Row>${header.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows
    .map(
      (e) =>
        `<Row>${cell(e.date)}${cell(e.category)}${cell(e.amount, 'Number')}${cell(e.note ?? '')}</Row>`
    )
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

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const ExportModal: React.FC<Props> = ({
  open, onClose, expenses, initialFrom = '', initialTo = '', initialCats,
}) => {
  const today = dayjs().format('YYYY-MM-DD');
  const [quickRange, setQuickRange] = useState<QuickRange>('all');
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo,   setDateTo]   = useState(initialTo);
  const [cats, setCats] = useState<Category[]>(initialCats ?? [...ALL_CATEGORIES]);

  const toggleCat = (cat: Category) =>
    setCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);

  // Compute effective date bounds
  const isCustom = quickRange === 'custom';
  const bounds = isCustom ? { start: dateFrom, end: dateTo } : quickBounds(quickRange);
  const start = bounds.start || '2000-01-01';
  const end   = bounds.end   || today;

  const filtered = useMemo(() =>
    expenses.filter((e) =>
      e.date >= start && e.date <= end && cats.includes(e.category)
    ),
    [expenses, start, end, cats]
  );

  const handleExport = (format: 'csv' | 'xlsx') => {
    const label = `expenses_${start}_to_${end}`;
    if (format === 'csv') {
      download(new Blob([toCSV(filtered)], { type: 'text/csv;charset=utf-8' }), `${label}.csv`);
    } else {
      download(toXLSX(filtered), `${label}.xls`);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Export Expenses</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} expenses selected</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Date range pills */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Date Range</span>
            <div className="flex gap-2 flex-wrap">
              {QUICK_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setQuickRange(r.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    quickRange === r.value
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            {isCustom && (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-medium">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || today}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-medium">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom}
                    max={today}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Categories</span>
              <div className="flex gap-2">
                <button onClick={() => setCats([...ALL_CATEGORIES])} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">All</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setCats([])} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <CategoryChip key={cat} category={cat} selected={cats.includes(cat)} onClick={toggleCat} multi />
              ))}
            </div>
          </div>

          {/* Preview summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Period</span>
              <span className="font-medium text-gray-700">{start === '2000-01-01' ? 'All time' : `${start} → ${end}`}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Expenses</span>
              <span className="font-medium text-gray-700">{filtered.length}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Total</span>
              <span className="font-semibold text-indigo-700">₹{filtered.reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
            </div>
            {cats.length < ALL_CATEGORIES.length && (
              <div className="flex gap-1 flex-wrap mt-1">
                {cats.map((c) => (
                  <span key={c} className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: CATEGORY_COLORS[c] }}>{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer — two export buttons */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={filtered.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition shadow-md shadow-indigo-200"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export as CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={filtered.length === 0}
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
