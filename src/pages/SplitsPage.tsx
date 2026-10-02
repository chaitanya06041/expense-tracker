import React, { useMemo, useState } from 'react';
import { UNSPLITTED_PERSON_NAME, type PaymentLog, type Person, type SplitRecord } from '../types';
import SplitDetailModal from '../components/SplitDetailModal';

interface Props {
  splits: SplitRecord[];
  paymentLogs: PaymentLog[];
  people: Person[];
  onReduce: (personId: string, amount: number) => void;
  onZeroOut: (personId: string) => void;
}

interface PersonSummary {
  person: Person;
  totalOwed: number;
  totalRemaining: number;
}

const SplitsPage: React.FC<Props> = ({ splits, paymentLogs, people, onReduce, onZeroOut }) => {
  const [reduceInputs, setReduceInputs] = useState<Record<string, string>>({});
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);

  // Aggregate per person across all splits — exclude the Unsplitted virtual person
  const personSummaries = useMemo((): PersonSummary[] => {
    const map: Record<string, { totalOwed: number; totalRemaining: number }> = {};
    splits.forEach((s) => {
      s.shares.forEach((sh) => {
        if (!map[sh.personId]) map[sh.personId] = { totalOwed: 0, totalRemaining: 0 };
        map[sh.personId].totalOwed += sh.amount;
        map[sh.personId].totalRemaining += sh.amount - sh.paid;
      });
    });
    return Object.entries(map)
      .map(([personId, sums]) => {
        const person = people.find((p) => p.id === personId);
        if (!person) return null;
        return { person, ...sums };
      })
      .filter((x): x is PersonSummary => x !== null)
      // Never show the Unsplitted virtual person — their share is always an expense
      .filter((x) => x.person.name.toLowerCase() !== UNSPLITTED_PERSON_NAME.toLowerCase())
      // Hide people whose remaining is zero (fully settled / zeroed out)
      .filter((x) => x.totalRemaining > 0.005)
      .sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [splits, people]);

  const totalPending = personSummaries.reduce((s, ps) => s + ps.totalRemaining, 0);

  const handleReduce = (personId: string) => {
    const val = parseFloat(reduceInputs[personId] || '0');
    if (!val || isNaN(val) || val <= 0) return;
    onReduce(personId, val);
    setReduceInputs((prev) => ({ ...prev, [personId]: '' }));
  };

  return (
    <div className="px-4 py-5 flex flex-col gap-5 max-w-lg mx-auto">

      {/* Header banner */}
      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-200">
        <p className="text-violet-100 text-xs font-medium uppercase tracking-widest mb-1">Total Pending</p>
        <p className="text-white text-3xl font-bold">₹{totalPending.toFixed(2)}</p>
        <p className="text-violet-200 text-xs mt-1">{personSummaries.length} {personSummaries.length === 1 ? 'person' : 'people'} owe you</p>
      </div>

      {personSummaries.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No splits yet. Add an expense and use "Want to split?"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {personSummaries.map(({ person, totalOwed, totalRemaining }) => {
            const settled = totalRemaining <= 0.005;
            const reduceVal = parseFloat(reduceInputs[person.id] || '0');
            const canReduce = !isNaN(reduceVal) && reduceVal > 0 && reduceVal <= totalRemaining;

            return (
              <div
                key={person.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm ${settled ? 'border-emerald-200' : 'border-gray-200'}`}
              >
                {/* Person header row */}
                <div className={`flex items-center gap-3 px-4 py-3.5 ${settled ? 'bg-emerald-50' : 'bg-gray-50'} border-b ${settled ? 'border-emerald-100' : 'border-gray-100'}`}>
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${settled ? 'bg-emerald-200' : 'bg-indigo-100'}`}>
                    <span className={`text-sm font-bold ${settled ? 'text-emerald-700' : 'text-indigo-600'}`}>
                      {person.name[0].toUpperCase()}
                    </span>
                  </div>

                  {/* Name + amount */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 truncate">{person.name}</span>
                      {settled && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest flex-shrink-0">Settled</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className={`text-lg font-bold ${settled ? 'text-emerald-600' : 'text-gray-900'}`}>
                        ₹{totalRemaining.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400">of ₹{totalOwed.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* View details button */}
                  <button
                    onClick={() => setDetailPerson(person)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-100 hover:bg-indigo-100 transition flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    Details
                  </button>
                </div>

                {/* Controls */}
                <div className="px-4 py-3 flex items-center gap-2">
                  {/* Amount input */}
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">₹</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder={settled ? 'Settled' : `Max ₹${totalRemaining.toFixed(2)}`}
                      disabled={settled}
                      value={reduceInputs[person.id] ?? ''}
                      onChange={(e) => setReduceInputs((prev) => ({ ...prev, [person.id]: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-6 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder:text-gray-300 disabled:opacity-50"
                    />
                  </div>

                  {/* Reduce button — active only when amount is valid */}
                  <button
                    onClick={() => handleReduce(person.id)}
                    disabled={!canReduce}
                    title="Reduce balance"
                    className="px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-200 text-xs font-semibold transition flex items-center gap-1 flex-shrink-0"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Reduce
                  </button>

                  {/* Delete (set to zero) — always active */}
                  <button
                    onClick={() => onZeroOut(person.id)}
                    title="Mark all as settled (set to zero)"
                    className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 border border-red-200 transition flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <SplitDetailModal
        open={!!detailPerson}
        person={detailPerson}
        splits={splits}
        paymentLogs={paymentLogs}
        onZeroOut={(personId) => {
          onZeroOut(personId);
          setDetailPerson(null);
        }}
        onClose={() => setDetailPerson(null)}
      />
    </div>
  );
};

export default SplitsPage;
