'use server';

import { stackServerApp } from '@/stack/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function addStaffToShop(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const staffEmail = formData.get('email') as string;

  if (!shopId || !staffEmail) {
    throw new Error('Shop ID and staff email are required.');
  }

  // 1. Security: Verify the current user is the owner of the shop
  const owner = await stackServerApp.getUser({ or: 'throw' });
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      ownerId: owner.id, // This ensures they own the shop
    },
  });

  if (!shop) {
    throw new Error('Not authorized or shop not found.');
  }

  // 2. Find the user to add as staff
  const staffUser = await prisma.user.findUnique({
    where: { email: staffEmail },
  });

  if (!staffUser) {
    // Consider returning a specific error code or message to the client
    throw new Error('User with that email does not exist in the system.');
  }

  // Check if the user is already a staff member
  const existingMembership = await prisma.staffMembership.findFirst({
    where: {
      userId: staffUser.id,
      shopId: shop.id,
    },
  });

  if (existingMembership) {
    // Or just return gracefully
    throw new Error('This user is already a staff member of this shop.');
  }

  // 3. Create the staff membership
  await prisma.staffMembership.create({
    data: {
      userId: staffUser.id,
      shopId: shop.id,
    },
  });

  // 4. Refresh the shop page to show the new staff member
  revalidatePath(`/shop/${shop.id}`);
}
