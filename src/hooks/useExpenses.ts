import { useState, useCallback, useEffect } from 'react';
import { type Expense } from '../types';
import { loadExpenses, insertExpense, deleteExpense } from '../utils/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Load from Supabase on mount
  useEffect(() => {
    loadExpenses().then(setExpenses);
  }, []);

  const addExpense = useCallback(async (expense: Expense) => {
    await insertExpense(expense);
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const deleteExpenseById = useCallback(async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, addExpense, deleteExpense: deleteExpenseById };
}
