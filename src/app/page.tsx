import { getShopsForUser } from '@/app/actions/shop';
import { signOutAction } from './actions/auth';
import { stackServerApp } from '@/stack/server';
import { Shop } from '@prisma/client';
import { User } from '@stackframe/stack';
import Link from 'next/link';
import { 
  Store, ArrowRight, ShieldCheck, CreditCard, 
  BarChart2, Users, ChevronRight, LogOut 
} from 'lucide-react';

export const dynamic = 'force-dynamic';

// Auth Navbar Component
function Navbar({ user }: { user: User | null }) {
  return (
    <nav className="w-[calc(100%-2rem)] max-w-5xl mx-auto flex items-center justify-between p-4 bg-gray-850/60 backdrop-blur-md border border-gray-800 rounded-2xl shadow-lg mt-4">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <Store className="h-5 w-5" />
        </div>
        <span className="font-black text-xl tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
          CoinTrace
        </span>
      </Link>

      {/* Auth Control */}
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Signed In</span>
              <span className="text-xs text-gray-300 font-semibold">{user.displayName || user.primaryEmail}</span>
            </div>
            
            <form action={signOutAction} className="flex items-center">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/handler/sign-in"
            className="flex items-center gap-1 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-950/20 active:scale-95"
          >
            Sign In
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </nav>
  );
}

// Shop Grid Component
function ShopList({ title, shops, role }: { title: string; shops: Shop[]; role: 'OWNER' | 'STAFF' }) {
  if (shops.length === 0) return null;
  
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest pl-1">{title} ({shops.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {shops.map((shop) => (
          <Link href={`/shop/${shop.id}`} key={shop.id} className="group">
            <div className={`p-5 pl-6 bg-gray-850 border border-gray-800 hover:border-gray-700/80 rounded-2xl shadow-md flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              role === 'OWNER'
                ? 'border-l-4 border-l-indigo-500 hover:shadow-indigo-950/20'
                : 'border-l-4 border-l-emerald-500 hover:shadow-emerald-950/20'
            }`}>
              <div className="flex items-center gap-3.5">
                <div className={`p-3 rounded-xl border transition-colors duration-300 ${
                  role === 'OWNER' 
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-650 group-hover:text-white group-hover:border-indigo-550' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-650 group-hover:text-white group-hover:border-emerald-550'
                }`}>
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-100 group-hover:text-white transition-colors">{shop.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    {role === 'OWNER' ? 'Owner' : 'Invited Staff'}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-300 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Welcome view for users with no shops
function WelcomeNewUser() {
  return (
    <div className="max-w-md p-8 space-y-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl flex flex-col items-center text-center">
      <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full">
        <Store className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-gray-100">Welcome to CoinTrace</h1>
        <p className="text-sm text-gray-400 leading-relaxed">
          Get started by creating your very first store database register. You will be set up as the store owner.
        </p>
      </div>
      <Link
        href="/shop/create"
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2 cursor-pointer"
      >
        Create Your First Shop
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default async function Home() {
  const user = await stackServerApp.getUser();
  const userName = user ? (user.displayName || user.primaryEmail?.split('@')[0] || 'User') : 'User';
  const { ownedShops, staffShops } = user ? await getShopsForUser() : { ownedShops: [], staffShops: [] };
  const hasShops = ownedShops.length > 0 || staffShops.length > 0;

  const features = [
    {
      icon: CreditCard,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      title: 'Sales POS',
      desc: 'Rapidly record customer sales checkout logs. Track product quantities and transaction totals.',
    },
    {
      icon: Users,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      title: 'Worker PIN Mode',
      desc: 'Lock dashboard reports and let active employees log sales locally on shared cash registers.',
    },
    {
      icon: ShieldCheck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      title: 'Supplier Ledger',
      desc: 'Keep complete tracking profiles on wholesale credit purchases and supplier cash payouts.',
    },
    {
      icon: BarChart2,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      title: 'Reports & Analytics',
      desc: 'Obtain daily, weekly, and monthly health checks on sales statistics, net cash, and payouts.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-white font-sans overflow-x-hidden">
      <Navbar user={user} />

      <main className="flex-grow w-full max-w-5xl mx-auto px-4 py-12 flex flex-col justify-center items-center gap-16">
        
        {!user ? (
          /* Marketing / Guest View */
          <div className="w-full space-y-16">
            
            {/* Hero Section */}
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <span className="px-3.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-300 tracking-wide uppercase">
                Digital Store Ledger & POS
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight bg-gradient-to-br from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                Modernize Your Shop Operations
              </h1>
              <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                Replaces traditional paper diaries with a fast digital register. Log daily sales checkout items, manage wholesale supplier debts, track cash flows, and secure logs with local worker PIN locks.
              </p>
              <div className="pt-2">
                <Link
                  href="/handler/sign-in"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-95 cursor-pointer"
                >
                  Start Managing Your Shop Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {features.map((feat, idx) => (
                <div key={idx} className="p-6 bg-gray-850 border border-gray-800 rounded-2xl flex flex-col gap-4 hover:border-gray-700 transition-colors shadow-md">
                  <div className={`p-3 rounded-xl border w-fit ${feat.color}`}>
                    <feat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-100">{feat.title}</h3>
                    <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        ) : !hasShops ? (
          /* Logged In, No Shops */
          <WelcomeNewUser />
        ) : (
          /* Logged In, Has Shops (Dashboard list) */
          <div className="w-full space-y-8 max-w-3xl animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-800">
              <div>
                <h1 className="text-2xl font-black text-gray-100">My Dashboards</h1>
                <p className="text-xs text-gray-400">Select a store registry to oversee billing and ledgers</p>
              </div>
              {staffShops.length === 0 && (
                <Link
                  href="/shop/create"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-indigo-950/20 cursor-pointer"
                >
                  Create Shop
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            {/* Custom Welcome Banners */}
            {staffShops.length > 0 ? (
              <div className="p-6 bg-gradient-to-br from-indigo-950/40 via-gray-900/80 to-purple-950/20 border border-indigo-900/30 rounded-3xl shadow-xl flex flex-col sm:flex-row gap-5 items-start sm:items-center animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
                  <ShieldCheck className="h-7 w-7 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-gray-100">
                    Welcome back, {userName}!
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You have secure access to <strong className="text-indigo-300 font-bold">{staffShops.length} store registers</strong> as an invited staff member. Select a shop below to open the sales checkout POS interface.
                  </p>
                </div>
              </div>
            ) : ownedShops.length > 0 ? (
              <div className="p-6 bg-gradient-to-br from-indigo-950/40 via-gray-900/80 to-indigo-950/10 border border-indigo-900/30 rounded-3xl shadow-xl flex flex-col sm:flex-row gap-5 items-start sm:items-center animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shrink-0">
                  <Store className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-gray-100">
                    Welcome back, {userName}!
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    You are signed in as a store owner. Select one of your store databases below to check sales performance, track credit books, and manage staff members.
                  </p>
                </div>
              </div>
            ) : null}

            <ShopList title="My Shops (Owner)" shops={ownedShops} role="OWNER" />
            <ShopList title="My Shops (Staff)" shops={staffShops} role="STAFF" />
          </div>
        )}

      </main>

      {/* Compliance / Regulatory Footer */}
      <footer className="w-full bg-gray-950 border-t border-gray-800 py-8 px-6 mt-16 text-center text-xs text-gray-500">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 CoinTrace. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/about" className="hover:text-indigo-400 transition-colors">
              About & Contact
            </Link>
            <Link href="/pricing" className="hover:text-indigo-400 transition-colors">
              Pricing Plans
            </Link>
            <Link href="/privacy" className="hover:text-indigo-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-indigo-400 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/refund" className="hover:text-indigo-400 transition-colors">
              Refund & Cancellation
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}