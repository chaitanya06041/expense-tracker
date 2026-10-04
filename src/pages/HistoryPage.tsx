import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { loadExpenseMonths } from '../utils/storage';
import ExportModal from '../components/ExportModal';

interface Props {
  onViewMonth: (yearMonth: string) => void;
}

const HistoryPage: React.FC<Props> = ({ onViewMonth }) => {
  const [months, setMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportMonth, setExportMonth] = useState<string | null>(null);

  useEffect(() => {
    loadExpenseMonths().then((m) => {
      setMonths(m);
      setLoading(false);
    });
  }, []);

  const currentYM = dayjs().format('YYYY-MM');

  return (
    <div className="px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto">

      <div>
        <h2 className="text-lg font-bold text-gray-900 leading-tight">History</h2>
        <p className="text-xs text-gray-400 mt-0.5">Past months — tap View to browse, Download to export</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <svg className="animate-spin text-indigo-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
          </svg>
        </div>
      ) : months.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-gray-400 text-sm">No expense history yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {months
            .filter((ym) => ym !== currentYM) // current month shown in Expenses tab
            .map((ym, i, arr) => {
              const label = dayjs(ym + '-01').format('MMMM YYYY');
              return (
                <div
                  key={ym}
                  className={`flex items-center justify-between px-4 py-3.5 ${
                    i < arr.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-800">{label}</span>
                  <div className="flex items-center gap-2">
                    {/* Download */}
                    <button
                      onClick={() => setExportMonth(ym)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download
                    </button>
                    {/* View */}
                    <button
                      onClick={() => onViewMonth(ym)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Export modal — only fetches data when opened */}
      {exportMonth && (
        <ExportModal
          open={true}
          onClose={() => setExportMonth(null)}
          yearMonth={exportMonth}
        />
      )}
    </div>
  );
};

export default HistoryPage;
