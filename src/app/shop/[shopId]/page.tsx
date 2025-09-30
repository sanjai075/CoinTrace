import { stackServerApp } from '@/stack/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function ShopPage({ params }: { params: { shopId: string } }) {
  const user = await stackServerApp.getUser({ or: 'throw' });

  const shop = await prisma.shop.findUnique({
    where: {
      id: params.shopId,
    },
    include: {
      owner: true, // Include the owner's details
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

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-gray-900 text-white">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold">Welcome to {shop.name}</h1>
        <p className="text-lg text-gray-400">
          Owned by: <span className="font-semibold text-gray-200">{shop.owner.email}</span>
        </p>
        {isOwner && (
          <div className="p-4 bg-green-900/50 border border-green-700 rounded-md">
            <p className="font-bold text-green-300">You are the owner of this shop.</p>
          </div>
        )}
        {/* Future components for managing the shop can go here */}
      </div>
    </main>
  );
}
