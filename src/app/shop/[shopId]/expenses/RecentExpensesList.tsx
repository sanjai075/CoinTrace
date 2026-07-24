'use client';

import { useShopStore } from '@/store/useShopStore';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';
import { deleteExpense } from '@/app/actions/kirana';

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  notes: string | null;
  createdAt: Date;
}

export default function RecentExpensesList({
  shopId,
  expenses,
}: {
  shopId: string;
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
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-sm text-rose-400">
                  - ₹{exp.amount.toFixed(2)}
                </span>
                <form
                  action={async (formData) => {
                    if (confirm("Are you sure you want to delete this expense?")) {
                      await deleteExpense(formData);
                    }
                  }}
                >
                  <input type="hidden" name="shopId" value={shopId} />
                  <input type="hidden" name="expenseId" value={exp.id} />
                  <button
                    type="submit"
                    className="p-1.5 text-gray-500 hover:text-rose-450 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete Expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
