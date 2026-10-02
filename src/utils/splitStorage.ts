import { type PaymentLog, type Person, type SplitRecord } from '../types';

const PEOPLE_KEY = 'expense_tracker_people';
const SPLITS_KEY = 'expense_tracker_splits';
const PAYMENT_LOG_KEY = 'expense_tracker_payment_logs';

// ── People ──────────────────────────────────────────────────────────────────
export function loadPeople(): Person[] {
  try {
    const raw = localStorage.getItem(PEOPLE_KEY);
    return raw ? (JSON.parse(raw) as Person[]) : [];
  } catch { return []; }
}
export function savePeople(people: Person[]): void {
  localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
}

// ── Payment Logs ──────────────────────────────────────────────────────────────
export function loadPaymentLogs(): PaymentLog[] {
  try {
    const raw = localStorage.getItem(PAYMENT_LOG_KEY);
    return raw ? (JSON.parse(raw) as PaymentLog[]) : [];
  } catch { return []; }
}
export function savePaymentLogs(logs: PaymentLog[]): void {
  localStorage.setItem(PAYMENT_LOG_KEY, JSON.stringify(logs));
}

// ── Splits ───────────────────────────────────────────────────────────────────
export function loadSplits(): SplitRecord[] {
  try {
    const raw = localStorage.getItem(SPLITS_KEY);
    return raw ? (JSON.parse(raw) as SplitRecord[]) : [];
  } catch { return []; }
}
export function saveSplits(splits: SplitRecord[]): void {
  localStorage.setItem(SPLITS_KEY, JSON.stringify(splits));
}
