import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { ALL_CATEGORIES, CATEGORY_COLORS, type Category, type Expense } from '../types';
import { loadExpensesForMonth } from '../utils/storage';
import ExportModal from '../components/ExportModal';

interface Props {
  yearMonth: string; // "YYYY-MM"
  onBack: () => void;
}

const HistoryDetailPage: React.FC<Props> = ({ yearMonth, onBack }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState<Category[]>([...ALL_CATEGORIES]);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadExpensesForMonth(yearMonth).then((data) => {
      setExpenses(data);
      setLoading(false);
    });
  }, [yearMonth]);

  const toggleCat = (cat: Category) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const filtered = useMemo(
    () => expenses.filter((e) => selectedCats.includes(e.category)),
    [expenses, selectedCats]
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const label = dayjs(yearMonth + '-01').format('MMMM YYYY');

  return (
    <div className="px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition -ml-1"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">{label}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? 'Loading…' : `${filtered.length} entries · ₹${total.toFixed(2)}`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowExport(true)}
          title="Export"
          className="p-2 rounded-xl text-gray-500 border border-gray-200 bg-white hover:bg-gray-50 transition"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
      </div>

      {/* Total banner */}
      {!loading && (
        <div className="rounded-2xl px-5 py-4 bg-gradient-to-br from-indigo-500 to-violet-600 flex justify-between items-center shadow-lg shadow-indigo-200">
          <div>
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest mb-1">Total Spent</p>
            <p className="text-white text-3xl font-bold">₹{total.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest mb-1">Entries</p>
            <p className="text-white text-2xl font-bold">{filtered.length}</p>
          </div>
        </div>
      )}

      {/* Category filter chips */}
      {!loading && expenses.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Filter by Category</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedCats([...ALL_CATEGORIES])} className="text-xs text-indigo-600 font-medium">All</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => setSelectedCats([])} className="text-xs text-gray-400 font-medium">None</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CATEGORIES.filter((c) => expenses.some((e) => e.category === c)).map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                style={
                  selectedCats.includes(cat)
                    ? { backgroundColor: CATEGORY_COLORS[cat], borderColor: CATEGORY_COLORS[cat], color: '#fff' }
                    : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', color: '#6b7280' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin text-indigo-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No expenses match the selected categories.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[90px_1fr_80px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Date</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Category / Note</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest text-right">Amount</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-gray-100">
            {filtered.map((e) => (
              <div key={e.id} className="grid grid-cols-[90px_1fr_80px] gap-2 items-center px-4 py-3">
                <span className="text-xs text-gray-500">
                  {dayjs(e.date + 'T00:00:00').format('DD MMM')}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[e.category] }}
                    />
                    <span className="text-xs font-semibold text-gray-800 truncate">{e.category}</span>
                  </div>
                  {e.note && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{e.note}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-800 text-right">₹{e.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
          {/* Table footer total */}
          <div className="grid grid-cols-[90px_1fr_80px] gap-2 px-4 py-2.5 bg-indigo-50 border-t border-indigo-100">
            <span className="text-xs font-semibold text-indigo-500 col-span-2">Total</span>
            <span className="text-xs font-bold text-indigo-700 text-right">₹{total.toFixed(2)}</span>
          </div>
        </div>
      )}

      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        yearMonth={yearMonth}
      />
    </div>
  );
};

export default HistoryDetailPage;
