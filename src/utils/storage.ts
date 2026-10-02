import { type Expense } from '../types';
import { authedClient } from './supabase';
import { getUrlToken } from './auth';

function db() {
  const token = getUrlToken() ?? '';
  return authedClient(token);
}

// Row shape coming back from Supabase (snake_case)
interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  amount: string | number;
  note: string | null;
}

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category as Expense['category'],
    amount: Number(row.amount),
    note: row.note ?? undefined,
  };
}

export async function loadExpenses(): Promise<Expense[]> {
  const { data, error } = await db()
    .from('expenses')
    .select('id, date, category, amount, note')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[storage] loadExpenses:', error.message);
    return [];
  }
  return (data as ExpenseRow[]).map(toExpense);
}

export async function insertExpense(expense: Expense): Promise<void> {
  const { error } = await db().from('expenses').insert({
    id: expense.id,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    note: expense.note ?? null,
  });
  if (error) throw new Error(`[storage] insertExpense: ${error.message}`);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await db().from('expenses').delete().eq('id', id);
  if (error) throw new Error(`[storage] deleteExpense: ${error.message}`);
}
