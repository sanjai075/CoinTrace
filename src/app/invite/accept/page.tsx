import { stackServerApp } from '@/stack/server';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { acceptStaffInvitation, declineStaffInvitation } from '@/app/actions/staff';
import { Store, UserCheck, ShieldAlert } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function AcceptInvitePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const invitationId = searchParams.id as string;

  if (!invitationId) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold">Invalid Link</h1>
          <p className="text-sm text-gray-400">
            This invitation link is invalid or has expired. Please check with the shop owner.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  // 1. Fetch invitation details
  const invitation = await prisma.staffInvitation.findUnique({
    where: { id: invitationId },
    include: { shop: { include: { owner: true } } },
  });

  if (!invitation) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-3xl max-w-md w-full text-center space-y-4 shadow-2xl">
          <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
          <h1 className="text-xl font-bold">Invitation Not Found</h1>
          <p className="text-sm text-gray-400">
            This invitation has already been accepted, declined, or cancelled by the owner.
          </p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            Go Home
          </Link>
        </div>
      </main>
    );
  }

  // 2. Check if logged in. If not, redirect to Stack sign-in/sign-up.
  const user = await stackServerApp.getUser();
  if (!user) {
    // Set a cookie with the pending invitation ID
    const cookieStore = await cookies();
    cookieStore.set('pending_invite_id', invitationId, { path: '/', maxAge: 3600 });
    // Redirect to sign in, preserving the redirect to this invite link after sign-up/sign-in
    redirect(`/handler/sign-in?next=${encodeURIComponent(`/invite/accept?id=${invitationId}`)}`);
  }

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4 overflow-x-hidden">
      <div className="w-full max-w-md p-6 sm:p-8 bg-gray-850 border border-gray-800 rounded-3xl shadow-2xl space-y-6 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="flex items-center gap-3.5 border-b border-gray-800 pb-5">
          <div className="p-3.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <Store className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-100">Staff Invitation</h1>
            <p className="text-[10px] text-gray-500">CoinTrace Shop Portal</p>
          </div>
        </div>

        {/* Invite text */}
        <div className="space-y-3">
          <p className="text-sm text-gray-300">
            You have been invited to join <span className="font-extrabold text-indigo-300">{invitation.shop.name}</span> as a remote staff member.
          </p>
          <div className="p-3.5 bg-gray-900/50 rounded-2xl border border-gray-800 text-xs text-gray-400 space-y-1.5">
            <p><strong>Shop Owner:</strong> {invitation.shop.owner.name || invitation.shop.owner.email}</p>
            <p><strong>Invited Phone:</strong> <span className="text-gray-300 font-semibold">{invitation.phone}</span></p>
          </div>
        </div>

        {/* Accept / Decline Forms */}
        <div className="space-y-3 pt-2">
          <form action={acceptStaffInvitation}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <UserCheck className="h-5 w-5" />
              Accept & Join Shop
            </button>
          </form>

          <form action={declineStaffInvitation}>
            <input type="hidden" name="invitationId" value={invitationId} />
            <button
              type="submit"
              className="w-full py-3 bg-gray-850 hover:bg-gray-800 text-gray-350 hover:text-white font-semibold rounded-2xl transition-all cursor-pointer text-xs border border-gray-800 hover:border-gray-750"
            >
              Decline Invitation
            </button>
          </form>
        </div>

        <div className="text-center pt-2">
          <p className="text-[10px] text-gray-500">
            By joining, you will be able to add sales, manage products, and assist in daily billing activities for this shop.
          </p>
        </div>
      </div>
    </main>
  );
}
