import React, { useState } from 'react';
import dayjs from 'dayjs';
import {
  ALL_CATEGORIES,
  CATEGORY_COLORS,
  type Category,
  type PaymentLog,
  type Person,
  type SplitRecord,
} from '../types';
import CategoryChip from './CategoryChip';

// ── Types ──────────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'amount';
type SortDir = 'asc' | 'desc';
type QuickDate = '7d' | '15d' | '1m' | '3m' | 'custom';

/** A unified row — either a split entry or an immutable payment log entry */
interface TableRow {
  id: string;
  type: 'split' | 'payment';
  date: string;
  amount: number;
  category?: Category;  // only for split rows
  note?: string;
  // split-specific
  splitId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const QUICK_OPTIONS: { value: QuickDate; label: string }[] = [
  { value: '7d',     label: '7D' },
  { value: '15d',    label: '15D' },
  { value: '1m',     label: '1M' },
  { value: '3m',     label: '3M' },
  { value: 'custom', label: 'Custom' },
];

function quickBounds(q: QuickDate, customFrom: string, customTo: string): { start: string; end: string } {
  const today = dayjs();
  const end = today.format('YYYY-MM-DD');
  switch (q) {
    case '7d':     return { start: today.subtract(6,  'day').format('YYYY-MM-DD'), end };
    case '15d':    return { start: today.subtract(14, 'day').format('YYYY-MM-DD'), end };
    case '1m':     return { start: today.subtract(1,  'month').format('YYYY-MM-DD'), end };
    case '3m':     return { start: today.subtract(3,  'month').format('YYYY-MM-DD'), end };
    case 'custom': return { start: customFrom || '2000-01-01', end: customTo || end };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  person: Person | null;
  splits: SplitRecord[];
  paymentLogs: PaymentLog[];
  onZeroOut: (personId: string) => void;
  onClose: () => void;
}

const SplitDetailModal: React.FC<Props> = ({
  open, person, splits, paymentLogs, onZeroOut, onClose,
}) => {
  const [quickDate, setQuickDate]   = useState<QuickDate>('3m');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');
  const [catFilter, setCatFilter]   = useState<Category[]>([...ALL_CATEGORIES]);
  const [sortKey,  setSortKey]      = useState<SortKey>('date');
  const [sortDir,  setSortDir]      = useState<SortDir>('desc');

  if (!open || !person) return null;

  const personId = person.id;
  const today    = dayjs().format('YYYY-MM-DD');

  // ── Totals (from all split rows, ignoring date filter) ──────────────────────
  const allSplitRows = splits.flatMap((s) =>
    s.shares
      .filter((sh) => sh.personId === personId)
      .map((sh) => ({ amount: sh.amount, paid: sh.paid }))
  );
  const totalOwed      = allSplitRows.reduce((s, r) => s + r.amount, 0);
  const totalRemaining = allSplitRows.reduce((s, r) => s + (r.amount - r.paid), 0);

  // ── Build unified table rows ─────────────────────────────────────────────────
  const splitTableRows: TableRow[] = splits.flatMap((s) =>
    s.shares
      .filter((sh) => sh.personId === personId)
      .map((sh) => ({
        id:       s.id,
        type:     'split' as const,
        date:     s.date,
        amount:   sh.amount,
        category: s.expenseCategory,
        note:     s.expenseNote,
        splitId:  s.id,
      }))
  );

  const paymentTableRows: TableRow[] = paymentLogs
    .filter((l) => l.personId === personId)
    .map((l) => ({
      id:     l.id,
      type:   'payment' as const,
      date:   l.date,
      amount: l.amount,
    }));

  const allRows: TableRow[] = [...splitTableRows, ...paymentTableRows];

  // ── Apply date + category filters ────────────────────────────────────────────
  const { start, end } = quickBounds(quickDate, customFrom, customTo);

  const filtered = allRows
    .filter((r) => r.date >= start && r.date <= end)
    .filter((r) => r.type === 'payment' || catFilter.includes(r.category!));

  // ── Sort ─────────────────────────────────────────────────────────────────────
  const sorted = [...filtered].sort((a, b) => {
    const mul = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'date')   return mul * a.date.localeCompare(b.date);
    return mul * (a.amount - b.amount);
  });

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => (
    <svg
      width="10" height="10" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      className={sortKey === k ? 'text-indigo-600' : 'text-gray-300'}
    >
      {sortDir === 'asc' && sortKey === k
        ? <polyline points="18 15 12 9 6 15"/>
        : <polyline points="6 9 12 15 18 9"/>
      }
    </svg>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-indigo-600">{person.name[0].toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">{person.name}</h2>
              <p className="text-xs text-gray-400">
                ₹{totalRemaining.toFixed(2)} remaining of ₹{totalOwed.toFixed(2)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

          {/* ── Date quick pills ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Period</span>
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setQuickDate(o.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    quickDate === o.value
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Custom date inputs — only shown when Custom is selected */}
            {quickDate === 'custom' && (
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-medium">From</span>
                  <input
                    type="date" value={customFrom} max={customTo || today}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 font-medium">To</span>
                  <input
                    type="date" value={customTo} min={customFrom} max={today}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Category filter ───────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Category</span>
              <div className="flex gap-2">
                <button onClick={() => setCatFilter([...ALL_CATEGORIES])} className="text-[10px] text-indigo-600 font-semibold">All</button>
                <span className="text-gray-300 text-[10px]">|</span>
                <button onClick={() => setCatFilter([])}                  className="text-[10px] text-gray-400 font-semibold">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat} category={cat} selected={catFilter.includes(cat)} multi
                  onClick={(c) => setCatFilter((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                  )}
                />
              ))}
            </div>
          </div>

          {/* ── Unified table ─────────────────────────────────────────────── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">

            {/* Column headers: Date | Category | Amount */}
            <div className="grid grid-cols-[90px_1fr_72px] gap-1 px-3 py-2 border-b border-gray-200 bg-white">
              <button
                onClick={() => toggleSort('date')}
                className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-left"
              >
                Date <SortIcon k="date" />
              </button>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Category</span>
              <button
                onClick={() => toggleSort('amount')}
                className="flex items-center justify-end gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest"
              >
                Amt <SortIcon k="amount" />
              </button>
            </div>

            {sorted.length === 0 ? (
              <p className="text-center text-gray-400 text-xs py-6">No entries match filters.</p>
            ) : (
              sorted.map((r) => {
                const isPayment = r.type === 'payment';
                return (
                  <div
                    key={r.id}
                    className={`grid grid-cols-[90px_1fr_72px] gap-1 items-center px-3 py-2.5 border-b border-gray-100 last:border-0 ${
                      isPayment ? 'bg-emerald-50' : ''
                    }`}
                  >
                    {/* Date */}
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-xs font-medium ${isPayment ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {dayjs(r.date + 'T00:00:00').format('DD MMM YY')}
                      </span>
                      {r.note && (
                        <span className="text-[10px] text-gray-400 truncate">{r.note}</span>
                      )}
                    </div>

                    {/* Category */}
                    {isPayment ? (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        Received
                      </span>
                    ) : (
                      <span
                        className="text-xs font-semibold truncate"
                        style={{ color: CATEGORY_COLORS[r.category!] }}
                      >
                        {r.category}
                      </span>
                    )}

                    {/* Amount */}
                    <span className={`text-xs font-bold text-right ${isPayment ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {isPayment ? '+' : ''}₹{r.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Zero-out button ───────────────────────────────────────────── */}
          {totalRemaining > 0.005 && (
            <button
              onClick={() => { onZeroOut(personId); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:scale-[0.98] transition shadow-sm"
            >
              Mark All as Settled (Set to Zero)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SplitDetailModal;
