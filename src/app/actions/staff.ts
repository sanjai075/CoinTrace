'use server';

import { stackServerApp } from '@/stack/server';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function addStaffToShop(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const staffEmail = formData.get('email') as string;

  if (!shopId || !staffEmail) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Shop ID and staff email are required.')}&status=error`);
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
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Not authorized or shop not found.')}&status=error`);
  }

  // 2. Find the user to add as staff
  const staffUser = await prisma.user.findUnique({
    where: { email: staffEmail },
  });

  if (!staffUser) {
    return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('User with that email does not exist in the system.')}&status=error`);
  }

  // Prevent adding the shop owner as staff
  if (staffUser.id === shop.ownerId) {
    return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('Cannot add the shop owner as staff.')}&status=warning`);
  }

  // Check if the user is already a staff member
  const existingMembership = await prisma.staffMembership.findFirst({
    where: {
      userId: staffUser.id,
      shopId: shop.id,
    },
  });

  if (existingMembership) {
    // Return gracefully with UI notice
    return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('This user is already a staff member of this shop.')}&status=warning`);
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
  return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('Staff member added successfully.')}&status=success`);
}

export async function removeStaffFromShop(formData: FormData) {
  const shopId = (formData.get('shopId') as string) || '';
  const userId = (formData.get('userId') as string) || '';

  if (!shopId || !userId) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Missing shop or user to remove.')}&status=error`);
  }

  const owner = await stackServerApp.getUser({ or: 'throw' });
  const shop = await prisma.shop.findFirst({ where: { id: shopId, ownerId: owner.id }, select: { id: true, ownerId: true } });
  if (!shop) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Not authorized or shop not found.')}&status=error`);
  }

  // Safety: don't allow removing the owner; owners are not in staffMemberships, but guard anyway
  if (userId === shop.ownerId) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Cannot remove the shop owner.')}&status=warning`);
  }

  const deleted = await prisma.staffMembership.deleteMany({ where: { shopId, userId } });
  revalidatePath(`/shop/${shopId}`);

  if (deleted.count === 0) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('That user is not a staff member of this shop.')}&status=warning`);
  }

  return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Staff member removed successfully.')}&status=success`);
}
