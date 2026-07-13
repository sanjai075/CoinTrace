import Link from 'next/link';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free Trial',
      price: '₹0',
      period: '15 Days',
      desc: 'Test the app with zero commitment.',
      shops: '1 Shop allowed',
      features: [
        'Record Cash Sales',
        'Basic Daily Reports',
        'Worker Pin Mode',
        'Add Unlimited Products',
      ],
      highlighted: false,
    },
    {
      name: 'One Shop',
      price: '₹99',
      period: 'per month',
      desc: 'Ideal for single retail shop owners.',
      shops: '1 Shop allowed',
      features: [
        'Record Cash & Credit Sales',
        'Detailed Analytics Reports',
        'Worker Pin Mode',
        'Manage Supplier Ledger',
        'WhatsApp Payment Reminders',
      ],
      highlighted: false,
    },
    {
      name: 'Two Shops',
      price: '₹199',
      period: 'per month',
      desc: 'Perfect for managing two retail outlets.',
      shops: 'Up to 2 Shops allowed',
      features: [
        'All features in One Shop',
        'Manage 2 Outlets in 1 Account',
        'Multi-Store Analytics',
        'Independent Worker Terminals',
      ],
      highlighted: true,
    },
    {
      name: 'Unlimited',
      price: '₹399',
      period: 'per month',
      desc: 'Best for wholesale owners and chains.',
      shops: 'Unlimited Shops allowed',
      features: [
        'All features in Two Shops',
        'Create Unlimited Outlets',
        'Consolidated Group Reporting',
        'Dedicated Priority Support',
      ],
      highlighted: false,
    },
  ];

  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-900 text-white flex flex-col items-center">
      <div className="w-full max-w-5xl space-y-10">
        
        {/* Navigation header */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2.5 bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white rounded-xl transition-all active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-400" />
              Pricing & Plans
            </h1>
            <p className="text-xs text-gray-400">Choose the perfect tier for your business</p>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`p-6 bg-gray-850 border rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden transition-all hover:scale-[1.01] ${
                plan.highlighted
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'border-gray-800'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute top-3 right-3 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-extrabold uppercase rounded-full tracking-wider">
                  Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-100">{plan.name}</h2>
                  <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-gray-500">/ {plan.period}</span>
                </div>

                <span className="inline-block px-3 py-1 bg-gray-900 border border-gray-800 text-[11px] font-bold text-indigo-400 rounded-lg">
                  {plan.shops}
                </span>

                <hr className="border-gray-800" />

                <ul className="space-y-2.5 text-xs text-gray-300">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Link
                  href="/shop/create"
                  className={`w-full py-2.5 inline-flex justify-center items-center text-xs font-bold rounded-xl transition-all ${
                    plan.highlighted
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-950/20'
                      : 'bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white border border-gray-750'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
