import { addExpense } from '@/app/actions/kirana';
import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { ExpenseCategory } from '@prisma/client';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, CreditCard, Plus } from 'lucide-react';
import { redirect, notFound } from 'next/navigation';
import { ENABLE_EXPENSES } from '@/lib/features';

import RecentExpensesList from './RecentExpensesList';

export default async function ExpensesPage(props: {
  params: Promise<{ shopId: string }>;
}) {
  if (!ENABLE_EXPENSES) {
    notFound();
  }

  const { shopId } = await props.params;
  const user = await stackServerApp.getUser();
  if (!user) {
    redirect('/handler/sign-in');
  }
  const t = await getTranslations();

  // Validate shop access
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
  });

  if (!shop) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
        <h1 className="text-xl font-bold">Shop not found.</h1>
      </div>
    );
  }

  // Fetch shop recent expenses
  const expenses = await prisma.expense.findMany({
    where: { shopId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <main className="min-h-screen w-full p-4 md:p-8 bg-gray-900 text-white flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Navigation header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/shop/${shopId}`}
            className="p-2 bg-gray-800 border border-gray-700 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-rose-400" />
              {t('expenses.title')}
            </h1>
            <p className="text-xs text-gray-400">{shop.name}</p>
          </div>
        </div>

        {/* Add Expense card */}
        <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('expenses.addExpense')}
          </h2>

          <form action={addExpense} className="space-y-4">
            <input type="hidden" name="shopId" value={shopId} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400">
                  {t('expenses.category')} *
                </label>
                <select
                  name="category"
                  required
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Select Category --</option>
                  {Object.values(ExpenseCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`expenses.categories.${cat}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400">
                  {t('expenses.amount')} (₹) *
                </label>
                <input
                  type="number"
                  name="amount"
                  min="1"
                  step="0.01"
                  required
                  placeholder="e.g., 250.00"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-rose-500 rounded-xl focus:outline-none text-sm text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">
                {t('expenses.notes')}
              </label>
              <input
                type="text"
                name="notes"
                placeholder="e.g., Electricity bill payment or transport cost"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-rose-500 rounded-xl focus:outline-none text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-rose-950/20"
            >
              {t('expenses.addExpense')}
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <RecentExpensesList expenses={expenses} />

      </div>
    </main>
  );
}
