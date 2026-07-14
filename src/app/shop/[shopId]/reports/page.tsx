import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, BarChart2, Share2, ChevronDown } from 'lucide-react';
import { ENABLE_CREDIT_CUSTOMER, ENABLE_EXPENSES, ENABLE_WHATSAPP_SHARE } from '@/lib/features';
import ReportDatePickerClient from './ReportDatePickerClient';
import QuickExpenseForm from './QuickExpenseForm';

export default async function ReportsPage(props: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { shopId } = await props.params;
  const searchParams = await props.searchParams;
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

  // Security check: Only owner is authorized to view reports
  const isOwner = user.id === shop.ownerId;
  if (!isOwner) {
    redirect(`/shop/${shopId}`);
  }

  // Timezone handler (IST: Asia/Kolkata, UTC+5:30)
  const IST_OFFSET_MINUTES = 330;

  // Default to today in IST
  const todayISTStr = new Date(new Date().getTime() + IST_OFFSET_MINUTES * 60_000).toISOString().split('T')[0];

  // Parse startDate and endDate, with backward compatibility for 'date'
  const startDateStr = (searchParams?.startDate as string) || (searchParams?.date as string) || todayISTStr;
  const endDateStr = (searchParams?.endDate as string) || (searchParams?.date as string) || todayISTStr;

  // Calculate UTC start/end range of the chosen IST calendar dates
  const [startY, startM, startD] = startDateStr.split('-').map(Number);
  const startOfDayUTC = new Date(Date.UTC(startY, startM - 1, startD, 0, 0, 0) - (IST_OFFSET_MINUTES * 60_000));

  const [endY, endM, endD] = endDateStr.split('-').map(Number);
  const endOfDayUTC = new Date(Date.UTC(endY, endM - 1, endD, 0, 0, 0) - (IST_OFFSET_MINUTES * 60_000) + 86_400_000);

  // Calculate dashboard ranges in IST -> UTC
  const [todayY, todayM, todayD] = todayISTStr.split('-').map(Number);
  const todayStart = new Date(Date.UTC(todayY, todayM - 1, todayD, 0, 0, 0) - (IST_OFFSET_MINUTES * 60_000));
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);

  // Yesterday start & end (IST -> UTC)
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const yesterdayEnd = todayStart;

  // Month start (1st of the current month)
  const monthStart = new Date(Date.UTC(todayY, todayM - 1, 1, 0, 0, 0) - (IST_OFFSET_MINUTES * 60_000));
  const monthEnd = todayEnd;

  // Fetch transactions for the selected day + dashboard stats
  const [
    sales,
    payments,
    expenses,
    supplierTxs,
    todaySalesData,
    yesterdaySalesData,
    monthSalesData,
    monthExpensesData
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId, createdAt: { gte: startOfDayUTC, lt: endOfDayUTC } },
      include: { items: { include: { product: true } } },
    }),
    prisma.customerTx.findMany({
      where: {
        customer: { shopId },
        type: 'PAYMENT_RCVD',
        createdAt: { gte: startOfDayUTC, lt: endOfDayUTC },
      },
    }),
    prisma.expense.findMany({
      where: { shopId, createdAt: { gte: startOfDayUTC, lt: endOfDayUTC } },
    }),
    prisma.supplierTx.findMany({
      where: {
        supplier: { shopId },
        createdAt: { gte: startOfDayUTC, lt: endOfDayUTC },
      },
    }),
    // Dashboard queries
    prisma.sale.findMany({
      where: { shopId, createdAt: { gte: todayStart, lt: todayEnd } },
      select: { total: true }
    }),
    prisma.sale.findMany({
      where: { shopId, createdAt: { gte: yesterdayStart, lt: yesterdayEnd } },
      select: { total: true }
    }),
    prisma.sale.findMany({
      where: { shopId, createdAt: { gte: monthStart, lt: monthEnd } },
      select: { total: true }
    }),
    prisma.expense.findMany({
      where: { shopId, createdAt: { gte: monthStart, lt: monthEnd } },
      select: { amount: true }
    })
  ]);

  // Aggregate stats
  const cashSales = sales.filter((s) => s.type === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const upiSales = sales.filter((s) => s.type === 'UPI').reduce((sum, s) => sum + s.total, 0);
  const creditSales = sales.filter((s) => s.type === 'CREDIT').reduce((sum, s) => sum + s.total, 0);
  const totalSales = cashSales + upiSales + creditSales;
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  
  const generalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const supplierPayments = supplierTxs
    .filter((t) => t.type === 'PAYMENT_PAID')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = generalExpenses + supplierPayments;
  
  // Net cash calculation
  const netCash = (cashSales + totalPayments) - totalExpenses;
  const netBalance = netCash + upiSales;

  // Dashboard Aggregates
  const todaySalesSum = todaySalesData.reduce((sum, s) => sum + s.total, 0);
  const yesterdaySalesSum = yesterdaySalesData.reduce((sum, s) => sum + s.total, 0);
  const monthSalesSum = monthSalesData.reduce((sum, s) => sum + s.total, 0);
  const monthExpensesSum = monthExpensesData.reduce((sum, e) => sum + e.amount, 0);
  const monthProfit = monthSalesSum - monthExpensesSum;

  const todaySalesCount = todaySalesData.length;
  const yesterdaySalesCount = yesterdaySalesData.length;
  const monthSalesCount = monthSalesData.length;

  // Product-wise sales summary logic
  const productSummaryMap: Record<string, { name: string; quantity: number }> = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const prodId = item.productId;
      const qty = item.quantity;
      const name = item.product.name;
      if (!productSummaryMap[prodId]) {
        productSummaryMap[prodId] = { name, quantity: 0 };
      }
      productSummaryMap[prodId].quantity += qty;
    });
  });

  const productSummary = Object.values(productSummaryMap).sort((a, b) => b.quantity - a.quantity);

  // Construct WhatsApp Share Text
  const waReportText = 
    `*${t('common.appName')} - ${startDateStr === endDateStr ? startDateStr : `${startDateStr} to ${endDateStr}`}*\n` +
    `-----------------------------------------\n` +
    `📈 ${t('reports.totalSales')}: ₹${totalSales.toFixed(2)}\n` +
    `   - ${t('reports.cashSales')}: ₹${cashSales.toFixed(2)}\n` +
    `   - ${t('reports.upiSales')}: ₹${upiSales.toFixed(2)}\n` +
    (ENABLE_CREDIT_CUSTOMER ? `   - ${t('reports.creditSales')}: ₹${creditSales.toFixed(2)}\n` : '') +
    (ENABLE_CREDIT_CUSTOMER ? `💰 ${t('reports.paymentsReceived')}: ₹${totalPayments.toFixed(2)}\n` : '') +
    (ENABLE_EXPENSES ? `💸 ${t('reports.totalExpenses')}: ₹${totalExpenses.toFixed(2)}\n` : '') +
    `-----------------------------------------\n` +
    (ENABLE_EXPENSES ? `🏦 ${t('shop.netCash')}: ₹${netCash.toFixed(2)}\n` : '') +
    (ENABLE_EXPENSES ? `💼 ${t('reports.netBalance')}: ₹${netBalance.toFixed(2)}\n\n` : '\n') +
    `*📦 ${t('reports.productWiseSales')}:*\n` +
    (productSummary.length === 0 
      ? `  - ${t('reports.noSales')}\n` 
      : productSummary.map((item) => `  - ${item.name}: ${item.quantity} ${t('reports.units')}`).join('\n'));

  const waUrl = `https://wa.me/?text=${encodeURIComponent(waReportText)}`;

  return (
    <main className="min-h-screen w-full p-4 md:p-8 bg-gray-900 text-white flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Navigation header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/shop/${shopId}`}
              className="p-2 bg-gray-800 border border-gray-700 hover:bg-gray-750 text-gray-300 hover:text-white rounded-lg transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2">
                <BarChart2 className="h-6 w-6 text-indigo-400" />
                {t('reports.title')}
              </h1>
              <p className="text-xs text-gray-400">{shop.name}</p>
            </div>
          </div>

          {ENABLE_WHATSAPP_SHARE && (
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold bg-green-600 hover:bg-green-700 text-white transition-all active:scale-[0.98] shadow-lg shadow-green-950/20"
            >
              <Share2 className="h-4 w-4" />
              {t('reports.shareReport')}
            </a>
          )}
        </div>

        {/* Sales Performance Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today Card */}
          <div className="p-4.5 bg-gray-850 border border-gray-800 rounded-2xl flex flex-col justify-between shadow-md hover:border-gray-700 transition-colors">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{"Today's Sales"}</span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-black text-white">₹{todaySalesSum.toFixed(2)}</span>
              <span className="text-[10px] text-gray-500 font-bold">{todaySalesCount} bills</span>
            </div>
          </div>

          {/* Yesterday Card */}
          <div className="p-4.5 bg-gray-850 border border-gray-800 rounded-2xl flex flex-col justify-between shadow-md hover:border-gray-700 transition-colors">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{t('reports.yesterdaySales')}</span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="text-xl font-black text-white">₹{yesterdaySalesSum.toFixed(2)}</span>
              <span className="text-[10px] text-gray-500 font-bold">{yesterdaySalesCount} bills</span>
            </div>
          </div>

          {/* This Month Card */}
          <div className="p-4.5 bg-gray-850 border border-gray-800 rounded-2xl flex flex-col justify-between shadow-md hover:border-gray-700 transition-colors">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">This Month</span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl font-black text-white">₹{monthSalesSum.toFixed(2)}</span>
                <span className="text-[10px] text-gray-500 font-bold">{monthSalesCount} bills</span>
              </div>
            </div>
            <div className="mt-2.5 pt-2 border-t border-gray-800/80 flex justify-between items-center text-xs">
              <span className="text-gray-400">Profit:</span>
              <span className={`font-bold ${monthProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{monthProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <ReportDatePickerClient
          shopId={shopId}
          selectedStartDate={startDateStr}
          selectedEndDate={endDateStr}
          labelText="Select Report Date:"
          viewButtonText="View"
        />

        {/* Aggregate report cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Cashflow summaries */}
          <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-200 border-b border-gray-750 pb-2">
              {t('reports.dailyReport')} ({startDateStr === endDateStr ? startDateStr : `${startDateStr} to ${endDateStr}`})
            </h2>

            <div className="space-y-3">
              {ENABLE_EXPENSES ? (
                <>
                  <details className="group" open>
                    <summary className="w-full flex justify-between items-center py-1 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden focus:outline-none">
                      <span className="text-sm text-gray-400 flex items-center gap-1.5 group-open:text-gray-250 transition-colors">
                        {t('reports.totalSales')}
                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-300 group-open:rotate-180 group-open:text-gray-300" />
                      </span>
                      <span className="text-sm font-bold text-gray-100">₹{totalSales.toFixed(2)}</span>
                    </summary>
                    <div className="space-y-2 pb-1.5 pl-4 border-l border-gray-800 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{t('reports.cashSales')}</span>
                        <span className="text-gray-200 font-medium">₹{cashSales.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">{t('reports.upiSales')}</span>
                        <span className="text-gray-200 font-medium">₹{upiSales.toFixed(2)}</span>
                      </div>
                      {ENABLE_CREDIT_CUSTOMER && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">{t('reports.creditSales')}</span>
                          <span className="text-gray-200 font-medium">₹{creditSales.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </details>
                  
                  {ENABLE_CREDIT_CUSTOMER && (
                    <div className="flex justify-between items-center py-1 border-t border-gray-800/60 pt-2">
                      <span className="text-sm text-gray-400">{t('reports.paymentsReceived')}</span>
                      <span className="text-sm font-bold text-emerald-400">₹{totalPayments.toFixed(2)}</span>
                    </div>
                  )}

                  <details className="group border-t border-gray-800/60 pt-2">
                    <summary className="w-full flex justify-between items-center py-1.5 text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden focus:outline-none">
                      <span className="text-sm text-gray-400 flex items-center gap-1.5 group-open:text-gray-250 transition-colors">
                        {t('reports.totalExpenses')}
                        <ChevronDown className="h-4 w-4 text-gray-500 transition-transform duration-300 group-open:rotate-180 group-open:text-gray-300" />
                      </span>
                      <span className="text-sm font-bold text-rose-400">₹{totalExpenses.toFixed(2)}</span>
                    </summary>
                    <div className="space-y-2 pb-1.5 pl-4 border-l border-gray-800 mt-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">General Expenses</span>
                        <span className="text-gray-200 font-medium">₹{generalExpenses.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">Supplier Payments Paid</span>
                        <span className="text-gray-200 font-medium">₹{supplierPayments.toFixed(2)}</span>
                      </div>
                    </div>
                  </details>

                  <div className="flex justify-between items-center py-3 border-t border-gray-700/80 pt-3">
                    <span className="text-base font-extrabold text-indigo-300">{t('shop.netCash')}</span>
                    <span className={`text-xl font-black ${netCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{netCash.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t border-gray-800/40">
                    <span className="text-base font-extrabold text-gray-300">{t('reports.netBalance')}</span>
                    <span className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{netBalance.toFixed(2)}
                    </span>
                  </div>

                  {/* Add Quick Expense inline */}
                  <div className="border-t border-gray-800/40 pt-3.5 mt-2">
                    <QuickExpenseForm shopId={shopId} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-sm text-gray-300 font-bold">
                      {t('reports.totalSales')}
                    </span>
                    <span className="text-base font-black text-gray-100">₹{totalSales.toFixed(2)}</span>
                  </div>
                  <div className="space-y-2.5 pb-1.5 pl-4 border-l border-gray-800 mt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{t('reports.cashSales')}</span>
                      <span className="text-gray-200 font-bold">₹{cashSales.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{t('reports.upiSales')}</span>
                      <span className="text-gray-200 font-bold">₹{upiSales.toFixed(2)}</span>
                    </div>
                    {ENABLE_CREDIT_CUSTOMER && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-400">{t('reports.creditSales')}</span>
                        <span className="text-gray-200 font-bold">₹{creditSales.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  {ENABLE_CREDIT_CUSTOMER && (
                    <div className="flex justify-between items-center py-2.5 border-t border-gray-800/60 pt-2.5 mt-2">
                      <span className="text-sm text-gray-400 font-bold">{t('reports.paymentsReceived')}</span>
                      <span className="text-sm font-black text-emerald-400">₹{totalPayments.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Today's Expenses Row */}
                  <div className="flex justify-between items-center py-2.5 border-t border-gray-800/60 pt-2.5 mt-2.5">
                    <span className="text-sm text-gray-400 font-bold">Today's Expenses</span>
                    <span className="text-sm font-bold text-rose-400">₹{totalExpenses.toFixed(2)}</span>
                  </div>

                  {/* Today's Net Profit Row */}
                  <div className="flex justify-between items-center py-3 border-t border-gray-750 pt-3">
                    <span className="text-base font-extrabold text-indigo-300 font-bold">Profit Today</span>
                    <span className={`text-xl font-black ${(totalSales - totalExpenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ₹{(totalSales - totalExpenses).toFixed(2)}
                    </span>
                  </div>

                  {/* Add Quick Expense inline */}
                  <div className="border-t border-gray-800/40 pt-3.5 mt-3">
                    <QuickExpenseForm shopId={shopId} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Product Sales Breakdown */}
          <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-gray-200 border-b border-gray-750 pb-2">
              📦 {t('reports.productWiseSales')}
            </h2>

            {productSummary.length === 0 ? (
              <p className="text-sm text-gray-500 py-12 text-center">{t('reports.noSales')}</p>
            ) : (
              <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {productSummary.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-300">{item.name}</span>
                    <span className="text-sm font-bold text-indigo-400">
                      {item.quantity} {t('reports.units')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}
