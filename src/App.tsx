import React, { useState } from 'react';
import AuthGate from './components/AuthGate';
import { UNSPLITTED_PERSON_NAME } from './types';
import { useExpenses } from './hooks/useExpenses';
import { useSplits } from './hooks/useSplits';
import { usePeople } from './hooks/usePeople';
import InputPage from './pages/InputPage';
import ExpensesPage from './pages/ExpensesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SplitsPage from './pages/SplitsPage';

type Tab = 'input' | 'expenses' | 'analytics' | 'splits';

const TABS: { id: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'input',
    label: 'Add',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="1"/>
        <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
      </svg>
    ),
  },
  {
    id: 'splits',
    label: 'Splits',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (active) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('input');
  const { expenses, addExpense, deleteExpense } = useExpenses();
  const { splits, paymentLogs, addSplit, reduceForPerson, clearPersonToZero } = useSplits();
  const { people } = usePeople();

  // Badge: count of splits with remaining balance — exclude the Unsplitted virtual person
  const unsplittedIds = new Set(
    people.filter((p) => p.name.toLowerCase() === UNSPLITTED_PERSON_NAME.toLowerCase()).map((p) => p.id)
  );
  const pendingSplits = splits.filter((s) =>
    s.shares.some((sh) => !unsplittedIds.has(sh.personId) && sh.amount - sh.paid > 0.005)
  ).length;

  return (
    <AuthGate>
    <div className="flex flex-col min-h-dvh max-w-[480px] mx-auto bg-[#f5f5f7]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-3.5 flex items-center gap-2 shadow-sm">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-sm">💰</div>
        <span className="font-bold text-gray-900 text-base tracking-tight">Expense Tracker</span>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'input' && (
          <InputPage expenses={expenses} people={people} onAdd={addExpense} onSplit={addSplit} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesPage expenses={expenses} onDelete={deleteExpense} />
        )}
        {activeTab === 'splits' && (
          <SplitsPage
            splits={splits}
            paymentLogs={paymentLogs}
            people={people}
            onReduce={reduceForPerson}
            onZeroOut={clearPersonToZero}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsPage expenses={expenses} />
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const showBadge = tab.id === 'splits' && pendingSplits > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative ${
                  active ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="relative">
                  {tab.icon(active)}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {pendingSplits}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-widest">{tab.label}</span>
                {active && <span className="w-4 h-0.5 rounded-full bg-indigo-600 absolute bottom-1" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    </AuthGate>
  );
};

export default App;
