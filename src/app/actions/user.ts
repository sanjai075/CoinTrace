'use server';

import { PrismaClient } from '@prisma/client';
import { stackServerApp } from '@/stack/server';

const prisma = new PrismaClient();

/**
 * Synchronizes the currently authenticated StackAuth user with the local Prisma database.
 * Creates the user if they don't exist, or updates their information if they do.
 */
export async function syncUser() {
  try {
    // 1. Get the authenticated user from StackAuth
    const stackUser = await stackServerApp.getUser();

    if (!stackUser) {
      console.log('No authenticated user found. Skipping sync.');
      return { error: 'User not authenticated' };
    }

    // 2. Use `upsert` to create or update the user in the database
    // `upsert` is perfect for this: it tries to update a record, and if it doesn't find one, it creates it.
    const dbUser = await prisma.user.upsert({
      where: {
        id: stackUser.id, // The unique ID from StackAuth is the primary key
      },
      update: {
        // Data to update if the user already exists
        email: stackUser.primaryEmail || '',
        name: stackUser.displayName,
        updatedAt: new Date(),
      },
      create: {
        // Data to use if a new user needs to be created
        id: stackUser.id,
        email: stackUser.primaryEmail || '',
        name: stackUser.displayName,
        role: 'STAFF', // Assign a default role
      },
    });

    console.log('User successfully synced to database:', dbUser);
    return { success: true, user: dbUser };
  } catch (error) {
    console.error('Failed to sync user to database:', error);
    return { error: 'Database sync failed' };
  } finally {
    await prisma.$disconnect();
  }
}
