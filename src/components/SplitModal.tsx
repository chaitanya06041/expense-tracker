import React, { useEffect, useMemo, useRef, useState } from 'react';
import { INPUT_CATEGORIES, CATEGORY_COLORS, ME_ID, ME_PERSON, type Category, type Person, type SplitRecord } from '../types';
import { usePeople } from '../hooks/usePeople';
import CategoryChip from './CategoryChip';

interface Props {
  open: boolean;
  onClose: () => void;
  expenseAmount: number;
  expenseId: string;
  expenseCategory: Category;
  expenseNote?: string;
  expenseDate: string;
  /** myShare is the "You" portion — the caller should add this as the expense amount */
  onSubmit: (split: Omit<SplitRecord, 'id'>, myShare: number) => void;
}

/** Returns up to 4 most-used people (excluding "You") based on existing splits */
function useFrequentPeople(people: Person[]): Person[] {
  return useMemo(() => {
    try {
      const raw = localStorage.getItem('expense_tracker_splits');
      const splits: SplitRecord[] = raw ? JSON.parse(raw) : [];
      const freq: Record<string, number> = {};
      splits.forEach((s) => s.shares.forEach((sh) => { freq[sh.personId] = (freq[sh.personId] || 0) + 1; }));
      return [...people]
        .filter((p) => p.id !== ME_ID && freq[p.id])
        .sort((a, b) => (freq[b.id] || 0) - (freq[a.id] || 0))
        .slice(0, 4);
    } catch { return []; }
  }, [people]);
}

const SplitModal: React.FC<Props> = ({
  open, onClose, expenseAmount, expenseId, expenseCategory, expenseNote, expenseDate, onSubmit,
}) => {
  const { people, addPerson, deletePerson } = usePeople();
  const frequent = useFrequentPeople(people);

  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [showDirectory, setShowDirectory] = useState(false);
  const [category, setCategory] = useState<Category>(expenseCategory);
  const [meIncluded, setMeIncluded] = useState(true);
  const [otherSelected, setOtherSelected] = useState<Person[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  const searchRef = useRef<HTMLInputElement>(null);

  // Participants for split calculation = You (if included) + others
  const allSelected = useMemo(
    () => (meIncluded ? [ME_PERSON, ...otherSelected] : otherSelected),
    [meIncluded, otherSelected]
  );

  // All rows shown in the amounts section = always You + others (so You is always visible)
  const amountRows = useMemo(
    () => [ME_PERSON, ...otherSelected],
    [otherSelected]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSearch('');
      setNewName('');
      setShowDirectory(false);
      setCategory(expenseCategory);
      setMeIncluded(true);
      setOtherSelected([]);
      setAmounts({ [ME_ID]: expenseAmount.toFixed(2) });
      setLockedIds(new Set());
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [open, expenseAmount, expenseCategory]);

  // Helper: distribute `total` equally among `targets`, last absorbs rounding
  function distributeEqually(targets: Person[], total: number): Record<string, string> {
    const map: Record<string, string> = {};
    if (targets.length === 0) return map;
    const share = +(total / targets.length).toFixed(2);
    targets.forEach((p, i) => {
      const isLast = i === targets.length - 1;
      map[p.id] = isLast ? (total - share * (targets.length - 1)).toFixed(2) : share.toFixed(2);
    });
    return map;
  }

  // Rebalance equally whenever participant list changes — clears all locks
  useEffect(() => {
    setLockedIds(new Set());
    if (allSelected.length === 0) {
      setAmounts({});
      return;
    }
    const map = distributeEqually(allSelected, expenseAmount);
    if (!meIncluded) map[ME_ID] = '0';
    setAmounts(map);
  }, [meIncluded, otherSelected, expenseAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredPeople = useMemo(
    () => people.filter((p) => p.id !== ME_ID && p.name.toLowerCase().includes(search.toLowerCase())),
    [people, search]
  );

  const toggleOther = (p: Person) => {
    setOtherSelected((prev) =>
      prev.find((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : [...prev, p]
    );
  };

  const handleAddPerson = async () => {
    const trimmed = (search.trim() || newName.trim());
    if (!trimmed || people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const person = await addPerson(trimmed);
    setNewName('');
    setSearch('');
    setOtherSelected((prev) => [...prev, person]);
  };

  const handleEqualSplit = () => {
    if (allSelected.length === 0) return;
    setLockedIds(new Set());
    const map = distributeEqually(allSelected, expenseAmount);
    if (!meIncluded) map[ME_ID] = '0';
    setAmounts(map);
  };

  const handleAmountChange = (personId: string, val: string) => {
    const parsed = parseFloat(val) || 0;

    const newLocked = new Set([...lockedIds, personId]);
    setLockedIds(newLocked);

    const lockedSum = allSelected
      .filter((p) => newLocked.has(p.id))
      .reduce((s, p) => s + (p.id === personId ? parsed : (parseFloat(amounts[p.id]) || 0)), 0);

    const unlocked = allSelected.filter((p) => !newLocked.has(p.id));
    const remainder = expenseAmount - lockedSum;
    const distributed = distributeEqually(unlocked, remainder);

    setAmounts((prev) => ({ ...prev, [personId]: val, ...distributed }));
  };

  const totalEntered = allSelected.reduce((s, p) => s + (parseFloat(amounts[p.id] ?? '0') || 0), 0);
  const totalMatches = Math.abs(totalEntered - expenseAmount) < 0.01;
  const canSubmit = otherSelected.length > 0 && totalMatches && !!category;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const myShare = parseFloat(amounts[ME_ID] || '0') || 0;
    onSubmit(
      {
        expenseId,
        expenseAmount,
        expenseCategory: category,
        expenseNote,
        date: expenseDate,
        shares: otherSelected.map((p) => ({
          personId: p.id,
          amount: parseFloat(amounts[p.id]),
          paid: 0,
        })),
      },
      myShare,
    );
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-[480px] bg-white rounded-t-3xl shadow-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Split Expense</h2>
            <p className="text-xs text-gray-400 mt-0.5">Total: ₹{expenseAmount.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

          {/* Category picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Category</span>
              {category && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full text-white"
                  style={{ backgroundColor: CATEGORY_COLORS[category] }}
                >
                  {category}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {INPUT_CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat}
                  category={cat}
                  selected={category === cat}
                  onClick={(c) => setCategory(c)}
                />
              ))}
            </div>
          </div>

          {/* People — frequent chips + search/add */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Split with</span>
              <button
                onClick={() => setShowDirectory((v) => !v)}
                title="Manage directory"
                className={`p-2.5 rounded-xl border transition-all ${
                  showDirectory
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                }`}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </button>
            </div>

            {/* Directory panel */}
            {showDirectory && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                {people.filter((p) => p.id !== ME_ID).length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">No saved people yet.</p>
                ) : (
                  <ul>
                    {people.filter((p) => p.id !== ME_ID).map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-indigo-600">{p.name[0].toUpperCase()}</span>
                        </div>
                        <span className="flex-1 text-sm text-gray-800 font-medium">{p.name}</span>
                        <button
                          onClick={() => {
                            setOtherSelected((prev) => prev.filter((x) => x.id !== p.id));
                            deletePerson(p.id);
                          }}
                          className="text-gray-300 hover:text-red-400 transition p-1 flex-shrink-0"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Frequent chips */}
            {frequent.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {frequent.map((p) => {
                  const sel = !!otherSelected.find((x) => x.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleOther(p)}
                      className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                        sel
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Search + add */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search or add person…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300"
                />
              </div>
              <button
                onClick={handleAddPerson}
                disabled={!search.trim() && !newName.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Search results — shown only when searching, hidden while directory is open */}
            {search.trim() && !showDirectory && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                {filteredPeople.length === 0 ? (
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 transition text-left"
                    onClick={async () => {
                      const trimmed = search.trim();
                      if (!trimmed || people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
                      const person = await addPerson(trimmed);
                      setOtherSelected((prev) => [...prev, person]);
                      setSearch('');
                    }}
                  >
                    <span className="text-sm text-gray-500">No match for "<span className="font-semibold text-gray-800">{search.trim()}</span>"</span>
                    <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add
                    </span>
                  </button>
                ) : (
                  <ul>
                    {filteredPeople.map((p) => {
                      const sel = !!otherSelected.find((x) => x.id === p.id);
                      return (
                        <li key={p.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0">
                          <button
                            onClick={() => { toggleOther(p); setSearch(''); }}
                            className="flex-1 text-sm text-gray-800 font-medium text-left"
                          >
                            {p.name}
                          </button>
                          {sel && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600 flex-shrink-0">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {/* Selected others as removable chips */}
            {otherSelected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {otherSelected.map((p) => (
                  <span key={p.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-semibold text-indigo-700">
                    {p.name}
                    <button onClick={() => toggleOther(p)} className="text-indigo-400 hover:text-indigo-700 transition">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Split amounts — shown once at least one other person is selected; You row always visible */}
          {otherSelected.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Split Amounts</span>
                <button
                  onClick={handleEqualSplit}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="5" y1="9" x2="19" y2="9"/><line x1="5" y1="15" x2="19" y2="15"/>
                  </svg>
                  Equal split
                </button>
              </div>

              {amountRows.map((p) => {
                const isMe = p.id === ME_ID;
                const disabled = isMe && !meIncluded;
                const val = parseFloat(amounts[p.id] ?? '0') || 0;
                const isInvalid = !disabled && (val < 0 || val > expenseAmount);
                return (
                  <div key={p.id} className={`flex items-center gap-3 ${disabled ? 'opacity-50' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? (meIncluded ? 'bg-indigo-600' : 'bg-gray-300') : 'bg-indigo-100'}`}>
                      <span className={`text-xs font-bold ${isMe ? 'text-white' : 'text-indigo-600'}`}>
                        {isMe ? 'Y' : p.name[0].toUpperCase()}
                      </span>
                    </div>

                    {/* Name — "You" is clickable to toggle, others are plain */}
                    {isMe ? (
                      <button
                        type="button"
                        onClick={() => setMeIncluded((v) => !v)}
                        className={`flex-1 text-sm font-medium text-left transition-colors ${meIncluded ? 'text-indigo-700' : 'text-gray-400'}`}
                      >
                        You
                        <span className="text-xs ml-1 text-gray-400">
                          {meIncluded ? '(tap to exclude)' : '(tap to include)'}
                        </span>
                      </button>
                    ) : (
                      <span className="flex-1 text-sm font-medium text-gray-800 truncate">{p.name}</span>
                    )}

                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amounts[p.id] ?? ''}
                        onChange={(e) => handleAmountChange(p.id, e.target.value)}
                        disabled={disabled}
                        className={`w-full rounded-xl pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition text-right border cursor-pointer ${
                          disabled
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : isInvalid
                              ? 'bg-red-50 border-red-400 text-gray-900 focus:ring-red-300'
                              : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-indigo-400'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Running total */}
              <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold border ${
                totalMatches
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span>Total entered</span>
                <span>
                  ₹{totalEntered.toFixed(2)}
                  {' / '}
                  ₹{expenseAmount.toFixed(2)}
                  {totalMatches ? ' ✓' : ` (₹${Math.abs(expenseAmount - totalEntered).toFixed(2)} ${totalEntered > expenseAmount ? 'over' : 'short'})`}
                </span>
              </div>

              {meIncluded && (
                <p className="text-xs text-gray-400 text-center">
                  Your share (₹{parseFloat(amounts[ME_ID] || '0').toFixed(2)}) will be added as your expense.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Save Split
          </button>
        </div>
      </div>
    </div>
  );
};

export default SplitModal;
