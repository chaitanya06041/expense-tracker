import { useState, useCallback } from 'react';
import { UNSPLITTED_PERSON_NAME, type PaymentLog, type Person, type SplitRecord } from '../types';
import { loadSplits, saveSplits, loadPaymentLogs, savePaymentLogs, loadPeople } from '../utils/splitStorage';
import { v4 } from '../utils/uuid';
import dayjs from 'dayjs';

/** Returns the set of person IDs whose name is the Unsplitted virtual person. */
function getUnsplittedIds(): Set<string> {
  const people: Person[] = loadPeople();
  return new Set(
    people.filter((p) => p.name.toLowerCase() === UNSPLITTED_PERSON_NAME.toLowerCase()).map((p) => p.id)
  );
}

export function useSplits() {
  const [splits, setSplits] = useState<SplitRecord[]>(() => loadSplits());
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>(() => loadPaymentLogs());

  const addSplit = useCallback((split: Omit<SplitRecord, 'id'>): SplitRecord => {
    // Strip Unsplitted virtual person from shares before persisting
    const unsplittedIds = getUnsplittedIds();
    const cleanedShares = split.shares.filter((sh) => !unsplittedIds.has(sh.personId));
    const record: SplitRecord = { id: v4(), ...split, shares: cleanedShares };
    // Don't save a split record that has no real shares left
    if (record.shares.length === 0) return record;
    setSplits((prev) => {
      const updated = [record, ...prev];
      saveSplits(updated);
      return updated;
    });
    return record;
  }, []);

  /**
   * Reduce a person's outstanding balance across their splits (oldest first),
   * and log the payment as an immutable entry.
   */
  const reduceForPerson = useCallback((personId: string, reduceAmount: number) => {
    setSplits((prevSplits) => {
      let remaining = reduceAmount;
      const updated = prevSplits.map((s) => {
        if (!s.shares.some((sh) => sh.personId === personId && sh.amount - sh.paid > 0.005)) return s;
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
      saveSplits(updated);
      return updated;
    });

    // Append immutable payment log
    const log: PaymentLog = {
      id: v4(),
      personId,
      amount: reduceAmount,
      date: dayjs().format('YYYY-MM-DD'),
    };
    setPaymentLogs((prev) => {
      const updated = [log, ...prev];
      savePaymentLogs(updated);
      return updated;
    });
  }, []);

  /**
   * Delete all split history for a person:
   * - Removes their share from every split record (fully deletes the record if they were the only share).
   * - Wipes all payment logs for that person.
   */
  const clearPersonToZero = useCallback((personId: string) => {
    setSplits((prev) => {
      const updated = prev
        .map((s) => ({ ...s, shares: s.shares.filter((sh) => sh.personId !== personId) }))
        // Drop the whole record if no shares remain
        .filter((s) => s.shares.length > 0);
      saveSplits(updated);
      return updated;
    });
    setPaymentLogs((prev) => {
      const updated = prev.filter((l) => l.personId !== personId);
      savePaymentLogs(updated);
      return updated;
    });
  }, []);

  /** Delete a single split record */
  const deleteSplit = useCallback((id: string) => {
    setSplits((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveSplits(updated);
      return updated;
    });
  }, []);

  return { splits, paymentLogs, addSplit, reduceForPerson, clearPersonToZero, deleteSplit };
}
