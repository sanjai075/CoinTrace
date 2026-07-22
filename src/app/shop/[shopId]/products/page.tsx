import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Package } from 'lucide-react';
import { redirect } from 'next/navigation';
import AddProductFormClient from './AddProductFormClient';
import ProductsDashboardClient from './ProductsDashboardClient';

export default async function ProductsPage(props: {
  params: Promise<{ shopId: string }>;
}) {
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

  // Fetch products, logs, and shops in parallel
  const [products, stockLogs, myShops] = await Promise.all([
    prisma.product.findMany({
      where: { shopId },
      orderBy: { name: 'asc' },
    }),
    prisma.stockAdjustmentLog.findMany({
      where: { shopId },
      include: {
        product: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.shop.findMany({
      where: { ownerId: user.id },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  ]);

  const formattedLogs = stockLogs.map(log => ({
    id: log.id,
    productName: log.product?.name || 'Deleted Product',
    staffName: log.staffName || 'System',
    oldStock: log.oldStock,
    newStock: log.newStock,
    change: log.change,
    createdAt: log.createdAt.toISOString(),
  }));

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
              <Package className="h-6 w-6 text-indigo-400" />
              {t('products.title')}
            </h1>
            <p className="text-xs text-gray-400">{shop.name}</p>
          </div>
        </div>

        {/* Add Product card */}
        <AddProductFormClient shopId={shopId} />

        {/* Catalog Dashboard */}
        <ProductsDashboardClient 
          shopId={shopId} 
          initialProducts={products} 
          initialLogs={formattedLogs}
          myShops={myShops}
        />

      </div>
    </main>
  );
}
