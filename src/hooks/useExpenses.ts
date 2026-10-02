import { useState, useCallback } from 'react';
import { type Expense } from '../types';
import { loadExpenses, saveExpenses } from '../utils/storage';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());

  const addExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => {
      const updated = [expense, ...prev];
      saveExpenses(updated);
      return updated;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveExpenses(updated);
      return updated;
    });
  }, []);

  return { expenses, addExpense, deleteExpense };
}
