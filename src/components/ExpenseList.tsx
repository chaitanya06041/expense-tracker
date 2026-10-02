import React from 'react';
import { type Expense, CATEGORY_COLORS } from '../types';

interface Props {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

const ExpenseList: React.FC<Props> = ({ expenses, onDelete }) => {
  if (expenses.length === 0) {
    return (
      <p className="text-center text-gray-400 text-sm py-8">No expenses added yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {expenses.map((e) => (
        <li
          key={e.id}
          className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS[e.category] }}
          />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-900 leading-tight">{e.category}</span>
            <span className="text-xs text-gray-400">{e.date}</span>
          </div>
          {e.note && (
            <span className="text-xs text-gray-400 truncate max-w-[80px]">{e.note}</span>
          )}
          <span className="font-bold text-sm text-gray-900 whitespace-nowrap">₹{e.amount.toFixed(2)}</span>
          <button
            onClick={() => onDelete(e.id)}
            aria-label="Delete expense"
            className="text-red-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
};

export default ExpenseList;
