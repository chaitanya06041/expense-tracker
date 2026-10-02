import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ALL_CATEGORIES, type Category, type Expense } from '../types';
import CategoryChip from '../components/CategoryChip';
import ExpenseList from '../components/ExpenseList';
import ExportModal from '../components/ExportModal';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

type QuickRange = 'today' | '7d' | '30d' | 'all' | 'custom';

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' },
];

function quickRangeBounds(r: QuickRange): { start: string; end: string } {
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

const ExpensesPage: React.FC<Props> = ({ expenses, onDelete }) => {
  const today = dayjs().format('YYYY-MM-DD');

  // Quick range pill
  const [quickRange, setQuickRange] = useState<QuickRange>('all');
  // Custom date range (overrides quick range when both filled)
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  // Amount filters
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  // Category filter
  const [selectedCats, setSelectedCats] = useState<Category[]>([...ALL_CATEGORIES]);
  // Search note
  const [search, setSearch] = useState('');
  // Show / hide filter panel
  const [showFilters, setShowFilters] = useState(false);
  // Export modal
  const [showExport, setShowExport] = useState(false);

  const toggleCat = (cat: Category) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const isCustom = quickRange === 'custom';

  // Determine active date bounds
  const { start: qStart, end: qEnd } = quickRangeBounds(quickRange);
  const start = isCustom ? (dateFrom || '2000-01-01') : (dateFrom || qStart);
  const end   = isCustom ? (dateTo   || today)        : (dateTo   || qEnd);

  const filtered = useMemo(() => {
    const minAmt = minAmount ? parseFloat(minAmount) : null;
    const maxAmt = maxAmount ? parseFloat(maxAmount) : null;
    return expenses.filter((e) => {
      if (e.date < start || e.date > end) return false;
      if (!selectedCats.includes(e.category)) return false;
      if (minAmt !== null && e.amount < minAmt) return false;
      if (maxAmt !== null && e.amount > maxAmt) return false;
      if (search && !(e.note?.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [expenses, start, end, selectedCats, minAmount, maxAmount, search]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  const hasCustomDate = dateFrom || dateTo;
  const activeFilterCount = [
    hasCustomDate,
    minAmount || maxAmount,
    selectedCats.length < ALL_CATEGORIES.length,
    search,
  ].filter(Boolean).length;

  const clearAll = () => {
    setDateFrom('');
    setDateTo('');
    setMinAmount('');
    setMaxAmount('');
    setSelectedCats([...ALL_CATEGORIES]);
    setSearch('');
    setQuickRange('all');
  };

  return (
    <div className="px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto">

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Expenses</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} entries · ₹{filteredTotal.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export button */}
          <button
            onClick={() => setShowExport(true)}
            title="Export expenses"
            className="p-2 rounded-xl text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          {/* Filters button */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white text-indigo-600 rounded-full w-4 h-4 text-[10px] font-bold flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search by category or note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        )}
      </div>

      {/* Quick date pills */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => { setQuickRange(r.value); if (r.value !== 'custom') { setDateFrom(''); setDateTo(''); } }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              quickRange === r.value
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs — shown when Custom pill is active */}
      {isCustom && (
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 font-medium">From</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || today}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition shadow-sm"
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
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">

          {/* Amount range */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Amount Range (₹)</label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-medium">Min</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-gray-400 font-medium">Max</span>
                <input
                  type="number"
                  min="0"
                  placeholder="∞"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Category</label>
              <div className="flex gap-2">
                <button onClick={() => setSelectedCats([...ALL_CATEGORIES])} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">All</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => setSelectedCats([])} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <CategoryChip key={cat} category={cat} selected={selectedCats.includes(cat)} onClick={toggleCat} multi />
              ))}
            </div>
          </div>

          {/* Clear */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 transition"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Expenses list */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No expenses match your filters.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          {/* Group by date */}
          {Object.entries(
            filtered.reduce<Record<string, Expense[]>>((acc, e) => {
              (acc[e.date] ??= []).push(e);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => {
              const dayTotal = items.reduce((s, e) => s + e.amount, 0);
              const label =
                date === dayjs().format('YYYY-MM-DD')
                  ? 'Today'
                  : date === dayjs().subtract(1, 'day').format('YYYY-MM-DD')
                  ? 'Yesterday'
                  : dayjs(date + 'T00:00:00').format('DD MMM YYYY');
              return (
                <div key={date} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-bold text-gray-700">₹{dayTotal.toFixed(2)}</span>
                  </div>
                  <ExpenseList expenses={items} onDelete={onDelete} />
                </div>
              );
            })}
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest">{filtered.length} expenses</span>
          <span className="text-sm font-bold text-indigo-700">Total ₹{filteredTotal.toFixed(2)}</span>
        </div>
      )}
      {/* Export modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        expenses={expenses}
        initialFrom={isCustom ? dateFrom : ''}
        initialTo={isCustom ? dateTo : ''}
        initialCats={selectedCats}
      />
    </div>
  );
};

export default ExpensesPage;
