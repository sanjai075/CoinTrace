import { addSupplier, recordSupplierTx } from '@/app/actions/kirana';
import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Truck, Plus, CheckCircle, MessageSquare } from 'lucide-react';
import { ENABLE_SUPPLIER_LEDGER } from '@/lib/features';

export default async function SuppliersPage(props: {
  params: Promise<{ shopId: string }>;
}) {
  if (!ENABLE_SUPPLIER_LEDGER) {
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

  // Security check: Only owner is authorized to view/edit supplier credit registers
  const isOwner = user.id === shop.ownerId;
  if (!isOwner) {
    redirect(`/shop/${shopId}`);
  }

  // Fetch shop suppliers
  const suppliers = await prisma.supplier.findMany({
    where: { shopId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <main className="min-h-screen w-full p-4 md:p-8 bg-gray-900 text-white flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-3xl space-y-6">
        
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
              <Truck className="h-6 w-6 text-indigo-400" />
              {t('khata.suppliersTitle')}
            </h1>
            <p className="text-xs text-gray-400">{shop.name}</p>
          </div>
        </div>

        {/* Add Supplier card */}
        <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t('khata.addSupplier')}
          </h2>

          <form action={addSupplier} className="space-y-4">
            <input type="hidden" name="shopId" value={shopId} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400">
                  {t('khata.supplierName')} *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Anamalai Distributors"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-400">
                  {t('khata.phoneNumber')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="e.g., 919876543210"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20"
            >
              {t('khata.addSupplier')}
            </button>
          </form>
        </div>

        {/* Record transaction paid or purchase */}
        <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Record Supplier Ledger Entry
          </h2>

          <form action={recordSupplierTx} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <input type="hidden" name="shopId" value={shopId} />
            
            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-400">
                Select Supplier *
              </label>
              <select
                name="supplierId"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Balance: ₹{s.runningBalance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-400">
                Transaction Type *
              </label>
              <select
                name="type"
                required
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="CREDIT_PURCHASE">🛍️ Credit Purchase (+)</option>
                <option value="PAYMENT_PAID">💵 Payment Paid (-)</option>
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
                placeholder="Amount"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-emerald-500 rounded-xl focus:outline-none text-sm text-white"
              />
            </div>

            <button
              type="submit"
              className="sm:col-span-4 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.98]"
            >
              Post Ledger Entry
            </button>
          </form>
        </div>

        {/* Supplier Ledger List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-200">{t('khata.suppliersTitle')} ({suppliers.length})</h2>

          <div className="grid grid-cols-1 gap-4">
            {suppliers.map((supplier) => {
              const text = encodeURIComponent(
                `Hello, this is regarding our supplier ledger at ${shop.name}. Our current balance is ₹${supplier.runningBalance.toFixed(2)}.`
              );
              const waUrl = supplier.phone
                ? `https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}?text=${text}`
                : null;

              return (
                <div
                  key={supplier.id}
                  className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-md space-y-4 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-lg text-gray-100">{supplier.name}</h3>
                      {supplier.phone && <p className="text-xs text-gray-400">📞 {supplier.phone}</p>}
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-400">{t('khata.runningBalance')}</p>
                      <p
                        className={`text-lg font-black ${
                          supplier.runningBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        ₹{supplier.runningBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-800/80 pt-3">
                    <span className="text-xs text-gray-500 font-bold uppercase">Recent ledger</span>
                    
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-600/20 text-green-300 border border-green-500/20 hover:bg-green-600/30 transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Message Supplier
                      </a>
                    )}
                  </div>

                  {supplier.transactions.length === 0 ? (
                    <p className="text-xs text-gray-500 font-medium">No transactions recorded.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs text-gray-400">
                      {supplier.transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between p-2 bg-gray-900/30 rounded-lg">
                          <span>
                            {tx.type === 'CREDIT_PURCHASE' ? '🛍️ Credit Purchase' : '💰 Payment Paid'}
                          </span>
                          <span className={tx.type === 'CREDIT_PURCHASE' ? 'text-amber-300' : 'text-emerald-300'}>
                            {tx.type === 'CREDIT_PURCHASE' ? '+' : '-'} ₹{tx.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </main>
  );
}
