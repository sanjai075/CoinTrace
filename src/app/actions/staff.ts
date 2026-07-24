'use server';

import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { Resend } from 'resend';

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

  // Prevent adding the shop owner as staff
  if (staffEmail.toLowerCase() === owner.primaryEmail?.toLowerCase()) {
    return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('Cannot add the shop owner as staff.')}&status=warning`);
  }

  // Check if the user is already a staff member
  const existingMembership = await prisma.staffMembership.findFirst({
    where: {
      shopId: shop.id,
      user: {
        email: {
          equals: staffEmail,
          mode: 'insensitive',
        },
      },
    },
  });

  if (existingMembership) {
    return redirect(`/shop/${shop.id}?notice=${encodeURIComponent('This user is already a staff member of this shop.')}&status=warning`);
  }

  // 2. Create the staff invitation in DB
  const invitation = await prisma.staffInvitation.upsert({
    where: {
      shopId_email: {
        shopId: shop.id,
        email: staffEmail.toLowerCase(),
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      email: staffEmail.toLowerCase(),
    },
  });

  // 3. Send email invite via Resend
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/accept?id=${invitation.id}`;
  let emailSent = false;
  let devNotice = '';

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'CoinTrace Onboarding <onboarding@resend.dev>',
        to: staffEmail,
        subject: `Invite to join ${shop.name} on CoinTrace`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #f9fafb;">
            <h2 style="color: #4f46e5; margin-bottom: 16px;">CoinTrace Staff Invitation</h2>
            <p>Hello,</p>
            <p>You have been invited to join the shop <strong>${shop.name}</strong> as a remote staff member.</p>
            <p>Please click the button below to accept the invitation and start managing sales and products:</p>
            <div style="margin: 24px 0;">
              <a href="${inviteLink}" style="padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">If you don't have a CoinTrace account yet, you will be prompted to create one using this email address.</p>
          </div>
        `,
      });
      emailSent = true;
    } catch (err) {
      console.error('Error sending Resend email:', err);
    }
  }

  if (!emailSent) {
    console.log(`\n--- [INVITATION LINK FOR DEV MODE] ---\nLink: ${inviteLink}\n--------------------------------------\n`);
    devNotice = ` (Dev Link: /invite/accept?id=${invitation.id})`;
  }

  // 4. Refresh page to show the new invitation
  revalidatePath(`/shop/${shop.id}`);
  return redirect(`/shop/${shop.id}?notice=${encodeURIComponent(`Invitation sent to ${staffEmail}.${devNotice}`)}&status=success`);
}

export async function acceptStaffInvitation(formData: FormData) {
  const user = await stackServerApp.getUser({ or: 'throw' });
  const invitationId = formData.get('invitationId') as string;

  if (!invitationId) {
    throw new Error('Invitation ID is required.');
  }

  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { shop: true },
  });

  if (!invitation) {
    throw new Error('Invitation not found or expired.');
  }

  // Security check: email matches invitation
  if (user.primaryEmail?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('This invitation was sent to another email address.');
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
  const user = await stackServerApp.getUser({ or: 'throw' });
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

  // Security check
  if (user.primaryEmail?.toLowerCase() !== invitation.email.toLowerCase()) {
    throw new Error('This invitation was sent to another email address.');
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
