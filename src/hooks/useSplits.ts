import { useState, useCallback, useEffect } from 'react';
import { UNSPLITTED_PERSON_NAME, type PaymentLog, type Person, type SplitRecord } from '../types';
import {
  loadSplits,
  loadPaymentLogs,
  loadPeople,
  insertSplitRecord,
  deleteSplitRecord,
  updateSharePaid,
  insertPaymentLog,
  deletePaymentLogsForPerson,
  clearSplitsForPerson,
} from '../utils/splitStorage';
import { v4 } from '../utils/uuid';
import dayjs from 'dayjs';

/** Returns the set of person IDs whose name is the Unsplitted virtual person. */
async function getUnsplittedIds(): Promise<Set<string>> {
  const people: Person[] = await loadPeople();
  return new Set(
    people
      .filter((p) => p.name.toLowerCase() === UNSPLITTED_PERSON_NAME.toLowerCase())
      .map((p) => p.id)
  );
}

export function useSplits() {
  const [splits, setSplits] = useState<SplitRecord[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);

  useEffect(() => {
    loadSplits().then(setSplits);
    loadPaymentLogs().then(setPaymentLogs);
  }, []);

  const addSplit = useCallback(async (split: Omit<SplitRecord, 'id'>): Promise<SplitRecord> => {
    const unsplittedIds = await getUnsplittedIds();
    const cleanedShares = split.shares.filter((sh) => !unsplittedIds.has(sh.personId));
    const record: SplitRecord = { id: v4(), ...split, shares: cleanedShares };

    if (record.shares.length === 0) return record;

    await insertSplitRecord(record);
    setSplits((prev) => [record, ...prev]);
    return record;
  }, []);

  /**
   * Reduce a person's outstanding balance across their splits (oldest first),
   * persist each updated share, and log the payment as an immutable entry.
   */
  const reduceForPerson = useCallback(async (personId: string, reduceAmount: number) => {
    let remaining = reduceAmount;

    const updatedSplits = await new Promise<SplitRecord[]>((resolve) => {
      setSplits((prevSplits) => {
        const next = prevSplits.map((s) => {
          if (!s.shares.some((sh) => sh.personId === personId && sh.amount - sh.paid > 0.005))
            return s;
          return {
            ...s,
            shares: s.shares.map((sh) => {
              if (sh.personId !== personId || remaining <= 0) return sh;
              const canReduce = sh.amount - sh.paid;
              const toApply = Math.min(canReduce, remaining);
              remaining -= toApply;
              return { ...sh, paid: sh.paid + toApply };
            }),
          };
        });
        resolve(next);
        return next;
      });
    });

    // Persist updated paid values to Supabase
    for (const s of updatedSplits) {
      for (const sh of s.shares) {
        if (sh.personId === personId) {
          await updateSharePaid(s.id, personId, sh.paid);
        }
      }
    }

    // Append immutable payment log
    const log: PaymentLog = {
      id: v4(),
      personId,
      amount: reduceAmount,
      date: dayjs().format('YYYY-MM-DD'),
    };
    await insertPaymentLog(log);
    setPaymentLogs((prev) => [log, ...prev]);
  }, []);

  /**
   * Delete all split history for a person:
   * - Removes their shares (and orphaned records) from the DB.
   * - Wipes all payment logs for that person.
   */
  const clearPersonToZero = useCallback(async (personId: string) => {
    await clearSplitsForPerson(personId);
    await deletePaymentLogsForPerson(personId);

    setSplits((prev) =>
      prev
        .map((s) => ({ ...s, shares: s.shares.filter((sh) => sh.personId !== personId) }))
        .filter((s) => s.shares.length > 0)
    );
    setPaymentLogs((prev) => prev.filter((l) => l.personId !== personId));
  }, []);

  /** Delete a single split record */
  const deleteSplit = useCallback(async (id: string) => {
    await deleteSplitRecord(id);
    setSplits((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { splits, paymentLogs, addSplit, reduceForPerson, clearPersonToZero, deleteSplit };
}
