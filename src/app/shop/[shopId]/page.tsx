import { addStaffToShop, removeStaffFromShop } from '@/app/actions/staff';
import { stackServerApp } from '@/stack/server';
import { PrismaClient } from '@prisma/client';
import AddBillClient from './AddBillClient';

const prisma = new PrismaClient();

type StaffItem = { user: { id: string; email: string | null } };

function StaffList({ staff, isOwner, shopId }: { staff: StaffItem[]; isOwner?: boolean; shopId?: string }) {
  if (staff.length === 0) {
    return <p className="text-gray-400">No staff members yet.</p>;
  }
  return (
    <div className="space-y-3">
      {staff.map(({ user }) => (
        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-md">
          <span className="text-gray-200">{user.email}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-blue-800 text-blue-200 rounded-full">Staff</span>
            {isOwner && shopId && (
              <form action={removeStaffFromShop}>
                <input type="hidden" name="shopId" value={shopId} />
                <input type="hidden" name="userId" value={user.id} />
                <button
                  type="submit"
                  className="text-xs px-2 py-1 rounded-md bg-rose-700 hover:bg-rose-800 text-white"
                >
                  Remove
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddStaffForm({ shopId }: { shopId: string }) {
  return (
    <form action={addStaffToShop} className="flex gap-2">
      <input type="hidden" name="shopId" value={shopId} />
      <input
        type="email"
        name="email"
        required
        placeholder="Enter staff email"
        className="flex-grow appearance-none block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Add Staff
      </button>
    </form>
  );
}

export default async function ShopPage(props: {
  params: Promise<{ shopId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { shopId } = await props.params;
  const searchParams = await props.searchParams;
  const user = await stackServerApp.getUser({ or: 'throw' });
  if (!shopId || typeof shopId !== 'string') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold">Invalid Shop ID.</h1>
      </main>
    );
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      owner: true,
      staffMemberships: { include: { user: true } },
    },
  });

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-4xl font-bold">Shop not found.</h1>
      </main>
    );
  }

  const isOwner = user.id === shop.ownerId;

  // UI notices from server actions (e.g., add staff)
  const notice = (searchParams?.notice as string) || null;
  const status = (searchParams?.status as string) || null;
  const bannerClass = (() => {
    switch (status) {
      case 'success':
        return 'bg-emerald-900/60 text-emerald-200 border border-emerald-700';
      case 'warning':
        return 'bg-amber-900/60 text-amber-200 border border-amber-700';
      case 'error':
        return 'bg-rose-900/60 text-rose-200 border border-rose-700';
      default:
        return 'bg-slate-800/60 text-slate-200 border border-slate-700';
    }
  })();

  // Timezone helpers (IST: Asia/Kolkata, UTC+5:30)
  const IST_OFFSET_MINUTES = 330; // 5.5 hours
  const toIST = (dUTC: Date) => new Date(dUTC.getTime() + IST_OFFSET_MINUTES * 60_000);
  const fromIST = (dIST: Date) => new Date(dIST.getTime() - IST_OFFSET_MINUTES * 60_000);

  // Return UTC Date representing IST midnight for the given UTC date
  const startOfDayISTUTC = (dUTC: Date) => {
    const ist = toIST(dUTC);
    ist.setHours(0, 0, 0, 0);
    return fromIST(ist);
  };
  // Return UTC Date representing IST Sunday 00:00 of the week containing the given UTC date
  const startOfWeekSundayISTUTC = (dUTC: Date) => {
    const ist = toIST(dUTC);
    ist.setHours(0, 0, 0, 0);
    const day = ist.getDay(); // 0 = Sun
    ist.setDate(ist.getDate() - day);
    return fromIST(ist);
  };
  // Return UTC Date representing IST month start (1st 00:00) for the month containing the given UTC date
  const startOfMonthISTUTC = (dUTC: Date) => {
    const ist = toIST(dUTC);
    const startIST = new Date(ist.getFullYear(), ist.getMonth(), 1);
    startIST.setHours(0, 0, 0, 0);
    return fromIST(startIST);
  };
  // Given a UTC Date that represents an IST midnight, return next day's IST midnight (UTC)
  const nextDayUTCFromISTStart = (startUTC: Date) => new Date(startUTC.getTime() + 86_400_000);
  // Parse YYYY-MM-DD as an IST calendar date, returning the UTC Date of its IST midnight
  const parseISODateToISTStartUTC = (s?: string | string[]) => {
    if (!s || Array.isArray(s)) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    // IST midnight corresponds to UTC time at y-m-d 18:30 of the previous day (y, m-1, d, -5:-30)
    const utcMs = Date.UTC(y, m - 1, d, -5, -30, 0);
    return new Date(utcMs);
  };

  // Owner-only analytics
  let totals: { today: number; weekToDate: number; monthToDate: number } | null = null;
  let specificDateTotal: number | null = null;
  let rangeTotal: number | null = null;
  let rangeError: string | null = null;
  let dateSelected: string | null = null;
  let rangeSelected: { from: string; to: string } | null = null;
  let showEntries = false;
  let dateEntryAmounts: number[] = [];

  if (isOwner) {
  const now = new Date();
  const startToday = startOfDayISTUTC(now);
  const startWeek = startOfWeekSundayISTUTC(now);
  const startMonth = startOfMonthISTUTC(now);

    const [sumToday, sumWeek, sumMonth] = await Promise.all([
      prisma.billEntry.aggregate({ _sum: { amount: true }, where: { bill: { is: { shopId } }, createdAt: { gte: startToday } } }),
      prisma.billEntry.aggregate({ _sum: { amount: true }, where: { bill: { is: { shopId } }, createdAt: { gte: startWeek } } }),
      prisma.billEntry.aggregate({ _sum: { amount: true }, where: { bill: { is: { shopId } }, createdAt: { gte: startMonth } } }),
    ]);

    totals = {
      today: sumToday._sum.amount ?? 0,
      weekToDate: sumWeek._sum.amount ?? 0,
      monthToDate: sumMonth._sum.amount ?? 0,
    };

    
    // Specific date total
    const dateStr = (searchParams?.date as string) || undefined;
    const dateStartUTC = parseISODateToISTStartUTC(dateStr);
    if (dateStartUTC) {
      dateSelected = dateStr!;
      const start = dateStartUTC;
      const endExcl = nextDayUTCFromISTStart(dateStartUTC);
      const agg = await prisma.billEntry.aggregate({ _sum: { amount: true }, where: { bill: { is: { shopId } }, createdAt: { gte: start, lt: endExcl } } });
      specificDateTotal = agg._sum.amount ?? 0;

      // Optional: list entries when requested
      showEntries = (searchParams?.showEntries as string) === '1';
      if (showEntries) {
        const entries = await prisma.billEntry.findMany({
          where: { bill: { is: { shopId } }, createdAt: { gte: start, lt: endExcl } },
          select: { amount: true },
          orderBy: { createdAt: 'asc' },
        });
        dateEntryAmounts = entries.map((e: { amount: number }) => e.amount);
      }
    }

    // Date range total
    const fromStr = (searchParams?.from as string) || undefined;
    const toStr = (searchParams?.to as string) || undefined;
    const from = parseISODateToISTStartUTC(fromStr);
    const to = parseISODateToISTStartUTC(toStr);
    if (fromStr || toStr) {
      if (!from || !to) {
        rangeError = 'Please provide both From and To dates in YYYY-MM-DD format.';
      } else if (from > to) {
        rangeError = 'From date must be on or before To date.';
      } else {
        rangeSelected = { from: fromStr!, to: toStr! };
        const start = from;
        const endExcl = nextDayUTCFromISTStart(to);
        const agg = await prisma.billEntry.aggregate({ _sum: { amount: true }, where: { bill: { is: { shopId } }, createdAt: { gte: start, lt: endExcl } } });
        rangeTotal = agg._sum.amount ?? 0;
      }
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-4xl p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
        {notice && (
          <div className={`p-3 rounded-md text-sm ${bannerClass}`}>
            {notice}
          </div>
        )}
        {/* Shop Header */}
        <div className="border-b border-gray-700 pb-4">
          <h1 className="text-4xl font-bold">Welcome to {shop.name}</h1>
          <p className="text-lg text-gray-400">
            Owned by: <span className="font-semibold text-gray-200">{shop.owner.email}</span>
          </p>
        </div>

        {/* Owner-only analytics */}
        {isOwner && totals && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Overview</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">Today</p>
                  <p className="text-2xl font-bold">₹{totals.today.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">This Week (Sun → Today)</p>
                  <p className="text-2xl font-bold">₹{totals.weekToDate.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-2xl font-bold">₹{totals.monthToDate.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Insights: pick a date or range */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Insights</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Specific Date */}
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <form method="GET" className="space-y-3">
                    <div className="flex items-end gap-2">
                      <label className="flex-1">
                        <span className="block text-sm text-gray-400 mb-1">Specific Date</span>
                        <input type="date" name="date" defaultValue={(searchParams?.date as string) || ''} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                      </label>
                      <button type="submit" className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Get Total</button>
                      <a href={`/shop/${shop.id}`} className="px-3 py-2 rounded-md bg-gray-700 text-gray-200 text-sm">Clear</a>
                      {dateSelected && !showEntries && (
                        <a href={`/shop/${shop.id}?date=${dateSelected}&showEntries=1`} className="px-3 py-2 rounded-md bg-emerald-700 text-white text-sm">View entries</a>
                      )}
                      {dateSelected && showEntries && (
                        <a href={`/shop/${shop.id}?date=${dateSelected}`} className="px-3 py-2 rounded-md bg-emerald-900 text-white text-sm">Hide entries</a>
                      )}
                    </div>
                  </form>
                  {dateSelected !== null && (
                    <p className="mt-3 text-gray-300">Total for {dateSelected}: <span className="font-semibold">₹{(specificDateTotal ?? 0).toFixed(2)}</span></p>
                  )}
                  {dateSelected && showEntries && (
                    <div className="mt-3 text-gray-300 text-sm space-y-1">
                      {dateEntryAmounts.length > 0 ? (
                        <>
                          <p className="break-words">{dateEntryAmounts.join(' + ')} +</p>
                          <p>
                            Entries: <span className="font-semibold">{dateEntryAmounts.length}</span> · Total: <span className="font-semibold">₹{dateEntryAmounts.reduce((a, b) => a + b, 0).toFixed(2)}</span>
                          </p>
                        </>
                      ) : (
                        <p>No entries for this date.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Date Range */}
                <div className="p-4 bg-gray-900/50 rounded-lg">
                  <form method="GET" className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label>
                        <span className="block text-sm text-gray-400 mb-1">From</span>
                        <input type="date" name="from" defaultValue={(searchParams?.from as string) || ''} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                      </label>
                      <label>
                        <span className="block text-sm text-gray-400 mb-1">To</span>
                        <input type="date" name="to" defaultValue={(searchParams?.to as string) || ''} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md" />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-3 py-2 rounded-md bg-indigo-600 text-white text-sm">Get Total</button>
                      <a href={`/shop/${shop.id}`} className="px-3 py-2 rounded-md bg-gray-700 text-gray-200 text-sm">Clear</a>
                    </div>
                  </form>
                  {rangeError && <p className="mt-3 text-red-400 text-sm">{rangeError}</p>}
                  {rangeSelected && !rangeError && (
                    <p className="mt-3 text-gray-300">Total for {rangeSelected.from} to {rangeSelected.to}: <span className="font-semibold">₹{(rangeTotal ?? 0).toFixed(2)}</span></p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Owner: Staff management | Staff: Add Bill */}
        {isOwner ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Staff Members</h2>
            <div className="p-6 bg-gray-900/50 rounded-lg">
              <details>
                <summary className="cursor-pointer select-none inline-flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30">
                  Add Staff
                </summary>
                <div className="mt-4">
                  <AddStaffForm shopId={shop.id} />
                </div>
              </details>
            </div>
            <div className="p-6 bg-gray-900/50 rounded-lg">
              <StaffList staff={shop.staffMemberships as unknown as StaffItem[]} isOwner shopId={shop.id} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Add Bill</h2>
            <div className="p-6 bg-gray-900/50 rounded-lg">
              <AddBillClient shopId={shop.id} />
            </div>
          </div>
        )}

        {/* Other sections like "Add Bill" can go here */}
      </div>
    </main>
  );
}
// cleaned duplicate bottom block removed