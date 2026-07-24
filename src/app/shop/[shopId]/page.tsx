import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import ShopDashboardClient from './ShopDashboardClient';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ShopPage(props: {
  params: Promise<{ shopId: string }>;
}) {
  const { shopId } = await props.params;
  const user = await stackServerApp.getUser();
  if (!user) {
    redirect('/handler/sign-in');
  }

  if (!shopId || typeof shopId !== 'string') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <h1 className="text-xl font-bold">Invalid Shop ID.</h1>
      </main>
    );
  }

  // Fetch shop details
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      owner: true,
      staffMemberships: { include: { user: true } },
    },
  });

  if (!shop) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <h1 className="text-xl font-bold">Shop not found.</h1>
      </main>
    );
  }

  // Verify access (owner or invited staff)
  const isOwner = user.id === shop.ownerId;
  const isStaff = shop.staffMemberships.some((m) => m.userId === user.id);
  if (!isOwner && !isStaff) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
        <h1 className="text-xl font-bold">Access Denied. You are not authorized for this shop.</h1>
      </main>
    );
  }

  // Fetch all other required data in parallel after validating the shop membership
  const [
    ownedShops,
    staffMemberships,
    products,
    customers,
    workers,
    otherStaff,
    staffInvitations
  ] = await Promise.all([
    prisma.shop.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true }
    }),
    prisma.staffMembership.findMany({
      where: { userId: user.id },
      include: { shop: { select: { id: true, name: true } } }
    }),
    prisma.product.findMany({
      where: { shopId, archived: false },
      select: { id: true, name: true, sellingPrice: true, barcode: true, stock: true },
      orderBy: { name: 'asc' },
    }),
    prisma.customer.findMany({
      where: { shopId },
      select: { id: true, name: true, runningBalance: true },
      orderBy: { name: 'asc' },
    }),
    prisma.worker.findMany({
      where: { shopId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    isOwner
      ? prisma.staffMembership.findMany({
          where: {
            shop: {
              ownerId: user.id,
              NOT: { id: shopId } // exclude this shop
            }
          },
          include: {
            user: { select: { email: true, name: true } }
          }
        })
      : Promise.resolve([]),
    isOwner
      ? prisma.staffInvitation.findMany({
          where: { shopId },
          select: { id: true, email: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        })
      : Promise.resolve([])
  ]);

  const myShops = [...ownedShops, ...staffMemberships.map(m => m.shop)];

  // Fetch emails of staff members working in other shops owned by this user
  let existingStaffEmails: Array<{ email: string; name: string }> = [];
  if (isOwner && otherStaff.length > 0) {
    const uniqueMap = new Map<string, string>();
    otherStaff.forEach(s => {
      if (s.user.email) {
        uniqueMap.set(s.user.email, s.user.name || 'Staff Member');
      }
    });
    existingStaffEmails = Array.from(uniqueMap.entries()).map(([email, name]) => ({ email, name }));
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center p-4 md:p-6 bg-gray-900 text-white overflow-x-hidden">
      {/* Header bar */}
      <div className="w-full max-w-5xl flex items-center justify-between border-b border-gray-800 pb-4 mb-5">
        <div>
          <h1 className="text-xl font-black tracking-tight text-indigo-400">CoinTrace</h1>
          <p className="text-[10px] text-gray-500">Welcome, {user.displayName || user.primaryEmail}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs font-bold px-3.5 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-750 text-gray-300 rounded-xl transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>

      <ShopDashboardClient 
        shop={{ id: shop.id, name: shop.name }}
        isOwner={isOwner}
        products={products}
        customers={customers}
        workers={workers}
        myShops={myShops}
        existingStaffEmails={existingStaffEmails}
        staffInvitations={staffInvitations}
        staffMemberships={shop.staffMemberships.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
        }))}
      />
    </main>
  );
}