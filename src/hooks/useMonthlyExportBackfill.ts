import { useEffect } from 'react';
import { runMonthlyExportBackfill } from '../utils/storage';

/**
 * Runs the monthly export backfill once after the component mounts.
 * Fully silent — no state, no UI, errors are logged to the console only.
 */
export function useMonthlyExportBackfill() {
  useEffect(() => {
    runMonthlyExportBackfill();
  }, []);
}
