'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';

export default function ReportDatePickerClient({
  shopId,
  selectedDate,
  labelText,
  viewButtonText
}: {
  shopId: string;
  selectedDate: string;
  labelText: string;
  viewButtonText: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(selectedDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    // Perform client-side route navigation to update query parameter smoothly
    router.push(`/shop/${shopId}/reports?date=${date}`);
  };

  return (
    <div className="p-4 bg-gray-850 border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <Calendar className="h-4 w-4 text-indigo-400" />
        <span>{labelText}</span>
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full sm:w-auto">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 bg-gray-900 border border-gray-750 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 w-full sm:w-auto cursor-pointer"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 font-bold rounded-xl text-sm transition-all cursor-pointer select-none"
        >
          {viewButtonText}
        </button>
      </form>
    </div>
  );
}
