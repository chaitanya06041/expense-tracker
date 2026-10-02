import { type PaymentLog, type Person, type SplitRecord, type SplitShare } from '../types';
import { authedClient } from './supabase';
import { getUrlToken } from './auth';

function db() {
  const token = getUrlToken() ?? '';
  return authedClient(token);
}

// ── People ───────────────────────────────────────────────────────────────────

export async function loadPeople(): Promise<Person[]> {
  const { data, error } = await db()
    .from('people')
    .select('id, name')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[splitStorage] loadPeople:', error.message);
    return [];
  }
  return data as Person[];
}

export async function insertPerson(person: Person): Promise<void> {
  const { error } = await db().from('people').insert({ id: person.id, name: person.name });
  if (error) throw new Error(`[splitStorage] insertPerson: ${error.message}`);
}

export async function deletePerson(id: string): Promise<void> {
  // Cascades to split_shares and payment_logs via FK
  const { error } = await db().from('people').delete().eq('id', id);
  if (error) throw new Error(`[splitStorage] deletePerson: ${error.message}`);
}

// ── Payment Logs ─────────────────────────────────────────────────────────────

interface PaymentLogRow {
  id: string;
  person_id: string;
  amount: string | number;
  date: string;
  note: string | null;
}

function toPaymentLog(row: PaymentLogRow): PaymentLog {
  return {
    id: row.id,
    personId: row.person_id,
    amount: Number(row.amount),
    date: row.date,
    note: row.note ?? undefined,
  };
}

export async function loadPaymentLogs(): Promise<PaymentLog[]> {
  const { data, error } = await db()
    .from('payment_logs')
    .select('id, person_id, amount, date, note')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[splitStorage] loadPaymentLogs:', error.message);
    return [];
  }
  return (data as PaymentLogRow[]).map(toPaymentLog);
}

export async function insertPaymentLog(log: PaymentLog): Promise<void> {
  const { error } = await db().from('payment_logs').insert({
    id: log.id,
    person_id: log.personId,
    amount: log.amount,
    date: log.date,
    note: log.note ?? null,
  });
  if (error) throw new Error(`[splitStorage] insertPaymentLog: ${error.message}`);
}

export async function deletePaymentLogsForPerson(personId: string): Promise<void> {
  const { error } = await db().from('payment_logs').delete().eq('person_id', personId);
  if (error) throw new Error(`[splitStorage] deletePaymentLogsForPerson: ${error.message}`);
}

// ── Splits ───────────────────────────────────────────────────────────────────

interface SplitRecordRow {
  id: string;
  expense_id: string;
  expense_amount: string | number;
  expense_category: string;
  expense_note: string | null;
  date: string;
  split_shares: SplitShareRow[];
}

interface SplitShareRow {
  id: string;
  split_record_id: string;
  person_id: string;
  amount: string | number;
  paid: string | number;
}

function toSplitRecord(row: SplitRecordRow): SplitRecord {
  return {
    id: row.id,
    expenseId: row.expense_id,
    expenseAmount: Number(row.expense_amount),
    expenseCategory: row.expense_category as SplitRecord['expenseCategory'],
    expenseNote: row.expense_note ?? undefined,
    date: row.date,
    shares: row.split_shares.map(
      (sh): SplitShare => ({
        personId: sh.person_id,
        amount: Number(sh.amount),
        paid: Number(sh.paid),
      })
    ),
  };
}

export async function loadSplits(): Promise<SplitRecord[]> {
  const { data, error } = await db()
    .from('split_records')
    .select(`
      id, expense_id, expense_amount, expense_category, expense_note, date,
      split_shares ( id, split_record_id, person_id, amount, paid )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[splitStorage] loadSplits:', error.message);
    return [];
  }
  return (data as SplitRecordRow[]).map(toSplitRecord);
}

export async function insertSplitRecord(record: SplitRecord): Promise<void> {
  const client = db();

  const { error: recErr } = await client.from('split_records').insert({
    id: record.id,
    expense_id: record.expenseId,
    expense_amount: record.expenseAmount,
    expense_category: record.expenseCategory,
    expense_note: record.expenseNote ?? null,
    date: record.date,
  });
  if (recErr) throw new Error(`[splitStorage] insertSplitRecord: ${recErr.message}`);

  if (record.shares.length > 0) {
    const { error: sharesErr } = await client.from('split_shares').insert(
      record.shares.map((sh) => ({
        split_record_id: record.id,
        person_id: sh.personId,
        amount: sh.amount,
        paid: sh.paid,
      }))
    );
    if (sharesErr) throw new Error(`[splitStorage] insertSplitShares: ${sharesErr.message}`);
  }
}

export async function deleteSplitRecord(id: string): Promise<void> {
  // split_shares cascade-delete via FK
  const { error } = await db().from('split_records').delete().eq('id', id);
  if (error) throw new Error(`[splitStorage] deleteSplitRecord: ${error.message}`);
}

/** Update the `paid` value for a specific (split_record, person) share. */
export async function updateSharePaid(
  splitRecordId: string,
  personId: string,
  newPaid: number
): Promise<void> {
  const { error } = await db()
    .from('split_shares')
    .update({ paid: newPaid })
    .eq('split_record_id', splitRecordId)
    .eq('person_id', personId);
  if (error) throw new Error(`[splitStorage] updateSharePaid: ${error.message}`);
}

/** Delete all split records where the only remaining share belongs to personId,
 *  and remove personId's share from any record that has other shares too. */
export async function clearSplitsForPerson(personId: string): Promise<void> {
  const client = db();

  // Delete the person's shares — records with no remaining shares cascade-clean
  // via the application layer (see useSplits), not via DB constraint, so we also
  // delete orphaned split_records afterwards.
  const { error: shareErr } = await client
    .from('split_shares')
    .delete()
    .eq('person_id', personId);
  if (shareErr) throw new Error(`[splitStorage] clearSplitsForPerson shares: ${shareErr.message}`);

  // Delete split_records that now have zero shares
  const { data: orphans, error: orphanReadErr } = await client
    .from('split_records')
    .select('id, split_shares(id)')
    .filter('split_shares.id', 'is', null); // no remaining shares

  if (orphanReadErr) {
    console.error('[splitStorage] clearSplitsForPerson orphan read:', orphanReadErr.message);
    return;
  }

  if (orphans && orphans.length > 0) {
    const ids = (orphans as { id: string }[]).map((r) => r.id);
    const { error: delErr } = await client.from('split_records').delete().in('id', ids);
    if (delErr) console.error('[splitStorage] clearSplitsForPerson orphan delete:', delErr.message);
  }
}
