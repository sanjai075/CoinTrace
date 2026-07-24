'use server';

import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function addStaffToShop(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const rawPhone = formData.get('phone') as string;

  if (!shopId || !rawPhone) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Shop ID and staff phone are required.')}&status=error`);
  }

  const cleanPhone = rawPhone.replace(/[^0-9+]/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Please enter a valid phone number.')}&status=error`);
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

  // 2. Create the staff invitation in DB
  await prisma.staffInvitation.upsert({
    where: {
      shopId_phone: {
        shopId: shop.id,
        phone: cleanPhone,
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      phone: cleanPhone,
    },
  });

  // 3. Refresh page to show the new invitation
  revalidatePath(`/shop/${shop.id}`);
  return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('Invitation generated successfully. Click Send below to share via WhatsApp.')}&status=success`);
}

export async function acceptStaffInvitation(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const invitationId = formData.get('invitationId') as string;

  if (!invitationId) {
    throw new Error('Invitation ID is required.');
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Invitation not found or expired.');
  }

  // Upsert membership and delete invitation in a transaction
  await prisma.$transaction([
    prisma.staffMembership.upsert({
      where: {
        shopId_userId: {
          shopId: invitation.shopId,
          userId: user.id,
        },
      },
      update: {},
      create: {
        shopId: invitation.shopId,
        userId: user.id,
      },
    }),
    prisma.staffInvitation.delete({
      where: { id: invitationId },
    }),
  ]);

  revalidatePath(`/shop/${invitation.shopId}`);
  return redirect(`/shop/${invitation.shopId}?notice=${encodeURIComponent('Welcome! You have joined the staff.')}&status=success`);
}

export async function declineStaffInvitation(formData: FormData) {
  const invitationId = formData.get('invitationId') as string;

  if (!invitationId) {
    throw new Error('Invitation ID is required.');
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Invitation not found.');
  }

  await prisma.staffInvitation.delete({
    where: { id: invitationId },
  });

  return redirect(`/?notice=${encodeURIComponent('Invitation declined.')}&status=info`);
}

export async function cancelStaffInvitation(formData: FormData) {
  const shopId = formData.get('shopId') as string;
  const invitationId = formData.get('invitationId') as string;

  if (!shopId || !invitationId) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Missing parameters.')}&status=error`);
  }

  const owner = await stackServerApp.getUser({ or: 'throw' });
  const shop = await prisma.shop.findFirst({
    where: { id: shopId, ownerId: owner.id },
  });

  if (!shop) {
    return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Not authorized.')}&status=error`);
  }

  await prisma.staffInvitation.delete({
    where: { id: invitationId, shopId },
  });

  revalidatePath(`/shop/${shopId}`);
  return redirect(`/shop/${shopId}?notice=${encodeURIComponent('Invitation cancelled.')}&status=success`);
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
