'use server';
import { redirect } from 'next/navigation';

export async function signOutAction(): Promise<void> {
  redirect('/handler/sign-out');
}
