import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CreateShopForm from './CreateShopForm';
import { Lock, ArrowLeft } from 'lucide-react';

export default async function CreateShopPage() {
  const user = await stackServerApp.getUser();
  if (!user) {
    redirect('/handler/sign-in');
  }

  // Ensure the user exists in our database
  let dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.primaryEmail || '',
        name: user.displayName || 'Owner',
        role: 'OWNER',
      },
    });
  }

  // Redirect to home if user is staff in any shop (safety rule)
  const isStaffAnywhere = await prisma.staffMembership.findFirst({
    where: { userId: dbUser.id },
  });
  if (isStaffAnywhere) {
    redirect('/');
  }

  const now = new Date();
  const ownedShopsCount = await prisma.shop.count({
    where: { ownerId: dbUser.id },
  });

  const isTrialActive = dbUser.trialEndsAt && dbUser.trialEndsAt > now;
  const isSubscriptionActive = dbUser.subscriptionEnds && dbUser.subscriptionEnds > now;

  let allowedShops = 0;
  let currentPlanLabel = 'Free Trial';

  if (isSubscriptionActive) {
    if (dbUser.subscriptionPlan === 'ONE_SHOP') {
      allowedShops = 1;
      currentPlanLabel = 'One Shop Plan';
    } else if (dbUser.subscriptionPlan === 'TWO_SHOPS') {
      allowedShops = 2;
      currentPlanLabel = 'Two Shops Plan';
    } else if (dbUser.subscriptionPlan === 'THREE_PLUS') {
      allowedShops = 999;
      currentPlanLabel = 'Unlimited Plan';
    }
  } else if (isTrialActive) {
    allowedShops = 1;
    currentPlanLabel = 'Free Trial';
  }

  const hasReachedLimit = ownedShopsCount >= allowedShops;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-900 text-white">
      {hasReachedLimit ? (
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl flex flex-col items-center text-center">
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full">
            <Lock className="h-8 w-8 animate-pulse" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-100">Shop Limit Reached</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              Your current <span className="font-bold text-indigo-300">{currentPlanLabel}</span> allows you to create up to{' '}
              <span className="font-bold text-gray-200">{allowedShops} {allowedShops === 1 ? 'shop' : 'shops'}</span>.
            </p>
            <p className="text-xs text-gray-500">
              Please upgrade your subscription to create additional shops and manage multiple businesses.
            </p>
          </div>

          <div className="w-full pt-4 flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3.5 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white font-bold rounded-xl border border-gray-700 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      ) : (
        <CreateShopForm />
      )}
    </main>
  );
}
