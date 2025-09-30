// Imports should be grouped at the top
import { getShopsForUser } from '@/app/actions/shop';
import { signOutAction } from './actions/auth';
import { stackServerApp } from '@/stack/server';
import { Shop } from '@prisma/client';
import { User } from '@stackframe/stack';
import Link from 'next/link';

// Component for the authentication header
function AuthHeader({ user }: { user: User | null }) {
  return (
    <header className="w-full flex justify-end items-center gap-4">
      {user ? (
        <>
          <span className="text-sm text-gray-400">Welcome, {user.displayName || user.primaryEmail}</span>
          <Link
            href="/shop/create"
            className="rounded-full bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Create Shop
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-full bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/handler/sign-in"
          className="rounded-full bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Sign In
        </Link>
      )}
    </header>
  );
}

// Component to display a list of shops
function ShopList({ title, shops }: { title: string; shops: Shop[] }) {
  if (shops.length === 0) {
    return null;
  }
  return (
    <div className="w-full max-w-2xl">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shops.map((shop) => (
          <Link href={`/shop/${shop.id}`} key={shop.id}>
            <div className="block p-6 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors">
              <h3 className="text-xl font-semibold">{shop.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Component to welcome a new user with no shops
function WelcomeNewUser() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to CoinTrace</h1>
      <p className="text-lg text-gray-400 mb-8">The easiest way to manage your shop's billing.</p>
      <Link
        href="/shop/create"
        className="rounded-full bg-indigo-600 text-white px-8 py-3 text-lg font-medium hover:bg-indigo-700 transition-colors"
      >
        Create Your First Shop
      </Link>
    </div>
  );
}

// The single, correct Home component
export default async function Home() {
  const user = await stackServerApp.getUser();
  // Only fetch shops if the user is logged in
  const { ownedShops, staffShops } = user ? await getShopsForUser() : { ownedShops: [], staffShops: [] };

  const hasShops = ownedShops.length > 0 || staffShops.length > 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-8 bg-gray-900 text-white">
      <AuthHeader user={user} />
      <main className="flex flex-col items-center justify-center flex-grow w-full">
        {!user ? (
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4">Welcome to CoinTrace</h1>
            <p className="text-xl text-gray-400">Sign in to manage your shops.</p>
          </div>
        ) : !hasShops ? (
          <WelcomeNewUser />
        ) : (
          <div className="w-full max-w-4xl space-y-8">
            <ShopList title="My Shops (Owner)" shops={ownedShops} />
            <ShopList title="My Shops (Staff)" shops={staffShops} />
          </div>
        )}
      </main>
    </div>
  );
}