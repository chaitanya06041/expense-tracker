import dayjs from 'dayjs';
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

/** Load expenses for a specific YYYY-MM month only. */
export async function loadExpensesForMonth(yearMonth: string): Promise<Expense[]> {
  const [y, m] = yearMonth.split('-').map(Number);
  const start = yearMonth + '-01';
  const endYM = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  const end = endYM + '-01';

  const { data, error } = await db()
    .from('expenses')
    .select('id, date, category, amount, note')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[storage] loadExpensesForMonth:', error.message);
    return [];
  }
  return (data as ExpenseRow[]).map(toExpense);
}

/**
 * Returns distinct "YYYY-MM" strings that have at least one expense,
 * sorted newest first. Fetches only the date column — no amounts loaded.
 */
export async function loadExpenseMonths(): Promise<string[]> {
  const { data, error } = await db()
    .from('expenses')
    .select('date')
    .order('date', { ascending: false });

  if (error) {
    console.error('[storage] loadExpenseMonths:', error.message);
    return [];
  }

  const seen = new Set<string>();
  for (const row of data as { date: string }[]) {
    seen.add(row.date.slice(0, 7));
  }
  return Array.from(seen); // already in newest-first order
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

// ── Monthly export backfill ───────────────────────────────────────────────────

function buildXLS(rows: Expense[]): Blob {
  const xmlEscape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cell = (v: string | number, type: 'String' | 'Number' = 'String') =>
    type === 'Number'
      ? `<Cell><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell><Data ss:Type="String">${xmlEscape(String(v))}</Data></Cell>`;
  const header = ['Date', 'Category', 'Amount (₹)', 'Note'];
  const headerRow = `<Row>${header.map((h) => cell(h)).join('')}</Row>`;
  const dataRows = rows
    .map((e) => `<Row>${cell(e.date)}${cell(e.category)}${cell(e.amount, 'Number')}${cell(e.note ?? '')}</Row>`)
    .join('');
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Expenses">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`;
  return new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

/**
 * Silently called on app load.
 * For every completed month (i.e. not the current month) that has expenses
 * but no entry in monthly_exports, fetches the data, uploads an XLS to the
 * 'expenses' bucket, and inserts a tracking row.
 */
export async function runMonthlyExportBackfill(): Promise<void> {
  const client = db();
  const currentYM = dayjs().format('YYYY-MM');

  // 1. Which months have expenses?
  const { data: dateDates, error: datesErr } = await client
    .from('expenses')
    .select('date')
    .order('date', { ascending: false });

  if (datesErr || !dateDates) return;

  const allMonths = new Set<string>();
  for (const row of dateDates as { date: string }[]) {
    allMonths.add(row.date.slice(0, 7));
  }
  // Only past months — never auto-upload current month (it's still in progress)
  const pastMonths = Array.from(allMonths).filter((ym) => ym < currentYM);
  if (pastMonths.length === 0) return;

  // 2. Which months are already uploaded?
  const { data: uploaded, error: uploadedErr } = await client
    .from('monthly_exports')
    .select('year_month')
    .in('year_month', pastMonths);

  if (uploadedErr) return;

  const uploadedSet = new Set((uploaded as { year_month: string }[]).map((r) => r.year_month));
  const missing = pastMonths.filter((ym) => !uploadedSet.has(ym));
  if (missing.length === 0) return;

  // 3. For each missing month: fetch → build XLS → upload → mark done
  for (const ym of missing) {
    try {
      const expenses = await loadExpensesForMonth(ym);
      if (expenses.length === 0) continue; // no rows to upload

      const blob = buildXLS(expenses);
      const filePath = `${ym}/expenses_${ym}.xls`;
      const arrayBuffer = await blob.arrayBuffer();

      const { error: uploadErr } = await client.storage
        .from('expenses')
        .upload(filePath, arrayBuffer, {
          contentType: 'application/vnd.ms-excel',
          upsert: true,
        });

      if (uploadErr) {
        console.error(`[backfill] upload failed for ${ym}:`, uploadErr.message);
        continue;
      }

      const { error: logErr } = await client.from('monthly_exports').insert({
        year_month: ym,
        file_path: filePath,
        file_size: blob.size,
      });

      if (logErr) {
        console.error(`[backfill] log insert failed for ${ym}:`, logErr.message);
      }
    } catch (err) {
      console.error(`[backfill] unexpected error for ${ym}:`, err);
    }
  }
}
