'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X, Loader2 } from 'lucide-react';
import { addExpense } from '@/app/actions/kirana';
import { ExpenseCategory } from '@prisma/client';

export default function QuickExpenseForm({ shopId }: { shopId: string }) {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.OTHERS);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    const formData = new FormData();
    formData.append('shopId', shopId);
    formData.append('category', category);
    formData.append('amount', amount);
    formData.append('notes', notes);

    startTransition(async () => {
      try {
        await addExpense(formData);
        // Reset form state on success
        setAmount('');
        setNotes('');
        setCategory(ExpenseCategory.OTHERS);
        setIsOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900/40 hover:bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl text-xs font-bold text-gray-400 hover:text-gray-200 transition-all cursor-pointer select-none active:scale-[0.98]"
      >
        <Plus className="h-4 w-4 text-indigo-400" />
        Add Quick Expense
      </button>
    );
  }

  return (
    <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-xl space-y-3 animate-in fade-in duration-200">
      <div className="flex justify-between items-center pb-1">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
          Add Quick Expense
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
          disabled={isPending}
          className="text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors cursor-pointer"
        >
          <X className="h-4.5 w-4.5" />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-rose-950/30 border border-rose-900/50 rounded-lg text-xs font-medium text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              {t('category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              disabled={isPending}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-lg text-xs text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
            >
              {Object.values(ExpenseCategory).map((cat) => (
                <option key={cat} value={cat}>
                  {t(`categories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
              {t('amount')} (₹) *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              min="0.01"
              step="0.01"
              required
              placeholder="e.g. 50"
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 focus:border-rose-500 rounded-lg focus:outline-none text-xs text-white disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
            {t('notes')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            placeholder="e.g. tea, cleaning, bulb purchase"
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 focus:border-rose-500 rounded-lg focus:outline-none text-xs text-white disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white text-xs font-bold rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed select-none shadow-md shadow-rose-950/10"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {tCommon('loading')}
            </>
          ) : (
            'Add Expense'
          )}
        </button>
      </form>
    </div>
  );
}
