import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { type Expense } from '../types';
import { loadExpensesForMonth, insertExpense, deleteExpense } from '../utils/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load only the current month on mount
  useEffect(() => {
    const ym = dayjs().format('YYYY-MM');
    loadExpensesForMonth(ym).then(setExpenses);
  }, []);

  const addExpense = useCallback(async (expense: Expense) => {
    await insertExpense(expense);
    // Only keep in local state if it belongs to current month
    const ym = dayjs().format('YYYY-MM');
    if (expense.date.startsWith(ym)) {
      setExpenses((prev) => [expense, ...prev]);
    }
  }, []);

  const deleteExpenseById = useCallback(async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, addExpense, deleteExpense: deleteExpenseById };
}
