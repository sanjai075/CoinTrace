'use client';

import { useShopStore } from '@/store/useShopStore';
import { useTranslations } from 'next-intl';

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
}

export default function RecentExpensesList({
  expenses,
}: {
  expenses: ExpenseItem[];
}) {
  const t = useTranslations();
  const isWorkerMode = useShopStore((state) => state.isWorkerMode);

  if (isWorkerMode) {
    return (
      <div className="p-6 bg-gray-850/80 border border-gray-800 rounded-2xl shadow-xl text-center py-8 space-y-2">
        <p className="text-sm text-gray-400 font-extrabold flex items-center justify-center gap-1.5">
          🔒 {t('expenses.restricted')}
        </p>
        <p className="text-xs text-gray-500">
          {t('expenses.restrictedDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
      <h2 className="text-lg font-bold text-gray-200">
        Recent Expenses
      </h2>

      {expenses.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No expenses logged yet.</p>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between p-3.5 bg-gray-900/50 rounded-xl border border-gray-800"
            >
              <div>
                <p className="font-semibold text-sm text-gray-200">
                  {t(`expenses.categories.${exp.category}`)}
                </p>
                {exp.notes && <p className="text-xs text-gray-400">{exp.notes}</p>}
                <p className="text-[10px] text-gray-500">
                  {new Date(exp.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="font-bold text-sm text-rose-400">
                - ₹{exp.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
