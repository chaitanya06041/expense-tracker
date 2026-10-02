import React, { useState } from 'react';
import dayjs from 'dayjs';
import { v4 as uuid } from '../utils/uuid';
import { INPUT_CATEGORIES, UNSPLITTED_PERSON_NAME, type Category, type Expense, type Person, type SplitRecord } from '../types';
import CategoryChip from '../components/CategoryChip';
import SplitModal from '../components/SplitModal';

interface Props {
  expenses: Expense[];
  people: Person[];
  onAdd: (e: Expense) => void;
  onSplit: (split: Omit<SplitRecord, 'id'>) => void;
}

const InputPage: React.FC<Props> = ({ expenses, people, onAdd, onSplit }) => {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [category, setCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  const handleCategoryClick = (cat: Category) => {
    setCategory((prev) => (prev === cat ? null : cat));
  };

  const parsedAmount = parseFloat(amount);
  const amountValid = !!amount && !isNaN(parsedAmount) && parsedAmount > 0;

  /** Regular "Add Expense" submit — full amount, no split */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!date) return setError('Please select a date.');
    if (!category) return setError('Please select a category.');
    if (!amountValid) return setError('Please enter a valid amount.');

    onAdd({ id: uuid(), date, category, amount: parsedAmount, note: note.trim() || undefined });
    setAmount('');
    setNote('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  /** Called when split modal is saved — adds your share as the expense, then records the split.
   *  If the "Unsplitted" virtual person is in the split, their share is recorded as a
   *  standalone Unsplitted-category expense rather than a tracked split debt. */
  const handleSplitSubmit = (split: Omit<SplitRecord, 'id'>, myShare: number) => {
    if (!category) return;

    // Separate the Unsplitted person's share out before doing anything else
    const unsplittedShare = split.shares.find((sh) => {
      const person = people.find((p) => p.id === sh.personId);
      return person?.name.toLowerCase() === UNSPLITTED_PERSON_NAME.toLowerCase();
    });

    const filteredShares = split.shares.filter((sh) => sh !== unsplittedShare);

    // Add the Unsplitted person's share as its own Unsplitted-category expense
    if (unsplittedShare && unsplittedShare.amount > 0) {
      onAdd({
        id: uuid(),
        date,
        category: 'Unsplitted',
        amount: unsplittedShare.amount,
        note: note.trim() || undefined,
      });
    }

    // Add your share as an expense under the selected category (only if non-zero)
    if (myShare > 0) {
      const expenseId = uuid();
      onAdd({
        id: expenseId,
        date,
        category,
        amount: myShare,
        note: note.trim() || undefined,
      });
      // Record the split (without the Unsplitted person) tied to this expense
      if (filteredShares.length > 0) {
        onSplit({ ...split, expenseId, shares: filteredShares });
      }
    } else {
      // Your share is 0 — just record the split if there are real debtors left
      if (filteredShares.length > 0) {
        onSplit({ ...split, expenseId: uuid(), shares: filteredShares });
      }
    }

    setAmount('');
    setNote('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const todayExpenses = expenses.filter((e) => e.date === dayjs().format('YYYY-MM-DD'));
  const todayTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

      {/* Today's total banner */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-indigo-500 to-violet-600 flex justify-between items-center shadow-lg shadow-indigo-200">
        <div>
          <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest mb-1">Today's Total</p>
          <p className="text-white text-3xl font-bold">₹{todayTotal.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest mb-1">Entries</p>
          <p className="text-white text-2xl font-bold">{todayExpenses.length}</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col gap-5 shadow-sm"
      >

        {/* Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Date</label>
          <input
            type="date"
            value={date}
            max={dayjs().format('YYYY-MM-DD')}
            onChange={(ev) => setDate(ev.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Category</label>
          <div className="flex flex-wrap gap-2">
            {INPUT_CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat}
                category={cat}
                selected={category === cat}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="amount" className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">₹</span>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(ev) => setAmount(ev.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300"
            />
          </div>
          {/* Split prompt */}
          {amountValid && (
            <button
              type="button"
              onClick={() => setSplitOpen(true)}
              className="self-start flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold mt-0.5 transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
              </svg>
              Want to split?
            </button>
          )}
        </div>

        {/* Note */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Note <span className="normal-case text-gray-300">(optional)</span>
          </label>
          <input
            id="note"
            type="text"
            placeholder="e.g. Lunch at office"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300"
          />
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-500 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-600 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Expense saved successfully!
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-semibold py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Expense
        </button>
      </form>

      {/* Split Modal */}
      <SplitModal
        open={splitOpen}
        onClose={() => setSplitOpen(false)}
        expenseAmount={parsedAmount || 0}
        expenseId={uuid()}
        expenseCategory={category ?? 'Grocery'}
        expenseNote={note.trim() || undefined}
        expenseDate={date}
        onSubmit={handleSplitSubmit}
      />
    </div>
  );
};

export default InputPage;
