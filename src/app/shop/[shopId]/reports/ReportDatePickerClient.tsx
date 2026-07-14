'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

export default function ReportDatePickerClient({
  shopId,
  selectedStartDate,
  selectedEndDate,
  labelText,
  viewButtonText
}: {
  shopId: string;
  selectedStartDate: string;
  selectedEndDate: string;
  labelText: string;
  viewButtonText: string;
}) {
  const router = useRouter();
  const [startDate, setStartDate] = useState(selectedStartDate);
  const [endDate, setEndDate] = useState(selectedEndDate);
  const [error, setError] = useState<string | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setStartDate(selectedStartDate);
    setEndDate(selectedEndDate);
    setError(null);
  }, [selectedStartDate, selectedEndDate]);

  // Helper to calculate relative date strings in IST offset (UTC +5:30)
  const getISTDateStr = (offsetDays = 0) => {
    const IST_OFFSET_MS = 330 * 60_000;
    const dateObj = new Date(new Date().getTime() + IST_OFFSET_MS + (offsetDays * 86_400_000));
    return dateObj.toISOString().split('T')[0];
  };

  const getThisMonthRange = () => {
    const IST_OFFSET_MS = 330 * 60_000;
    const dateObj = new Date(new Date().getTime() + IST_OFFSET_MS);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return {
      start: `${year}-${month}-01`,
      end: dateObj.toISOString().split('T')[0]
    };
  };

  const getLastMonthRange = () => {
    const IST_OFFSET_MS = 330 * 60_000;
    const dateObj = new Date(new Date().getTime() + IST_OFFSET_MS);
    dateObj.setMonth(dateObj.getMonth() - 1);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    };
  };

  // Submit helper that validates the date range
  const navigateToRange = (start: string, end: string) => {
    setError(null);
    const s = new Date(start);
    const e = new Date(end);

    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      setError('Please select valid start and end dates.');
      return;
    }

    if (s > e) {
      setError('Start Date cannot be after End Date.');
      return;
    }

    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      setError('Please select a range of 365 days or less.');
      return;
    }

    router.push(`/shop/${shopId}/reports?startDate=${start}&endDate=${end}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToRange(startDate, endDate);
  };

  // Preset handlers
  const handlePresetClick = (type: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth') => {
    let start = '';
    let end = '';

    if (type === 'today') {
      start = getISTDateStr(0);
      end = getISTDateStr(0);
    } else if (type === 'yesterday') {
      start = getISTDateStr(-1);
      end = getISTDateStr(-1);
    } else if (type === 'thisMonth') {
      const range = getThisMonthRange();
      start = range.start;
      end = range.end;
    } else if (type === 'lastMonth') {
      const range = getLastMonthRange();
      start = range.start;
      end = range.end;
    }

    setStartDate(start);
    setEndDate(end);
    navigateToRange(start, end);
  };

  const isActivePreset = (start: string, end: string) => {
    return startDate === start && endDate === end;
  };

  // Active presets checking values
  const todayVal = getISTDateStr(0);
  const yesterdayVal = getISTDateStr(-1);
  const thisMonthVal = getThisMonthRange();
  const lastMonthVal = getLastMonthRange();

  return (
    <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
      {/* Presets Row */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-800/40">
        <button
          type="button"
          onClick={() => handlePresetClick('today')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border ${
            isActivePreset(todayVal, todayVal)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-950/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick('yesterday')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border ${
            isActivePreset(yesterdayVal, yesterdayVal)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-950/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          Yesterday
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick('thisMonth')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border ${
            isActivePreset(thisMonthVal.start, thisMonthVal.end)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-950/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => handlePresetClick('lastMonth')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none border ${
            isActivePreset(lastMonthVal.start, lastMonthVal.end)
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-950/20'
              : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-gray-200'
          }`}
        >
          Last Month
        </button>
      </div>

      {error && (
        <div className="p-2.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      {/* Date Inputs & View Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Calendar className="h-4 w-4 text-indigo-400" />
          <span>{labelText}</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3.5 py-2.5 bg-gray-900 border border-gray-750 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none w-full sm:w-auto cursor-pointer"
            />
            <span className="text-gray-500 text-xs font-semibold px-0.5">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3.5 py-2.5 bg-gray-900 border border-gray-750 focus:border-indigo-500 rounded-xl text-xs text-white focus:outline-none w-full sm:w-auto cursor-pointer"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-xs transition-all cursor-pointer select-none active:scale-[0.98] shadow-md shadow-indigo-950/20"
          >
            {viewButtonText}
          </button>
        </form>
      </div>
    </div>
  );
}
