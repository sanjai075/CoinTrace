'use server';

import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createShop(formData: FormData): Promise<{ error: string } | null> {
  const user = await stackServerApp.getUser({
    or: 'throw',
  });

  const shopName = formData.get('name') as string;

  if (!shopName) {
    return { error: 'Shop name is required.' };
  }

  // Ensure the user from StackAuth exists in our database, auto-creating them if they don't
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
    console.log('Automatically registered missing user during shop creation:', dbUser);
  }

  // ----------------------------------------------------
  // Razorpay & Trial Subscription Checks
  // ----------------------------------------------------
  const now = new Date();
  const ownedShopsCount = await prisma.shop.count({
    where: { ownerId: dbUser.id },
  });

  const isTrialActive = dbUser.trialEndsAt && dbUser.trialEndsAt > now;
  const isSubscriptionActive = dbUser.subscriptionEnds && dbUser.subscriptionEnds > now;

  let allowedShops = 0;
  if (isSubscriptionActive) {
    if (dbUser.subscriptionPlan === 'ONE_SHOP') allowedShops = 1;
    else if (dbUser.subscriptionPlan === 'TWO_SHOPS') allowedShops = 2;
    else if (dbUser.subscriptionPlan === 'THREE_PLUS') allowedShops = 999;
  } else if (isTrialActive) {
    allowedShops = 1; // 1 free shop allowed during the 15-day trial period
  }

  if (ownedShopsCount >= allowedShops) {
    if (isSubscriptionActive) {
      return { error: `Your subscription plan (${dbUser.subscriptionPlan}) is limited to ${allowedShops} shop(s). Please upgrade to add more.` };
    } else if (isTrialActive) {
      return { error: 'Trial allows only 1 shop. Please upgrade your subscription to create more.' };
    } else {
      return { error: 'Your free trial has expired. Please choose a subscription plan to continue.' };
    }
  }

  // Create the shop
  let shop;
  try {
    shop = await prisma.shop.create({
      data: {
        name: shopName,
        ownerId: dbUser.id,
      },
    });
  } catch (err) {
    console.error('Failed to create shop in DB:', err);
    return { error: 'Failed to create shop. Please try again.' };
  }

  revalidatePath('/');
  redirect(`/shop/${shop.id}`);
}

export async function getShopsForUser() {
  const user = await stackServerApp.getUser();

  if (!user) {
    return { ownedShops: [], staffShops: [] };
  }

  const ownedShops = await prisma.shop.findMany({
    where: {
      ownerId: user.id,
    },
  });

  const staffMemberships = await prisma.staffMembership.findMany({
    where: {
      userId: user.id,
    },
    include: {
      shop: true,
    },
  });

  const staffShops = staffMemberships.map((m) => m.shop);

  return { ownedShops, staffShops };
}
