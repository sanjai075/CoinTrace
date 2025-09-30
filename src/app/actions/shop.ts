'use server';

import { stackServerApp } from '@/stack/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function createShop(formData: FormData) {
  const user = await stackServerApp.getUser({
    // By default, `getUser` will not throw if the user is not authenticated.
    // We want to throw an error in that case.
    or: 'throw',
  });

  const shopName = formData.get('name') as string;

  if (!shopName) {
    throw new Error('Shop name is required.');
  }

  // Ensure the user from StackAuth exists in our database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser) {
    // This case should ideally not be hit if UserSync is working correctly
    throw new Error('User not found in database. Please sign out and sign in again.');
  }

  const shop = await prisma.shop.create({
    data: {
      name: shopName,
      ownerId: dbUser.id, // Assign the current user as the owner
    },
  });

  // Invalidate caches for the homepage and redirect to the new shop's page
  revalidatePath('/');
  redirect(`/shop/${shop.id}`);
}
