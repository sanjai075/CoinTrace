import Link from 'next/link';
import { ArrowLeft, Shield, Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-3xl space-y-8">
        
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
              <Shield className="h-6 w-6 text-indigo-400" />
              Privacy Policy
            </h1>
            <p className="text-xs text-gray-400">Last updated: June 2026</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-6 text-sm text-gray-300 leading-relaxed">
          
          <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl mb-4">
            <Lock className="h-5 w-5 shrink-0" />
            <p className="text-xs font-semibold">Your store data, ledger records, and customer details are fully encrypted and securely stored. We never sell your business data.</p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">1. Information We Collect</h2>
            <p>
              To run the CoinTrace ledger service, we collect and store:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>**User profile information**: Account email, name, and role sync&apos;d via StackAuth.</li>
              <li>**Store data**: Shop names, item profiles, selling prices, and quantities.</li>
              <li>**Ledger entries**: Record of sales, supplier transactions, customer credits, and repayments.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">2. How We Use Information</h2>
            <p>
              We process your store data solely to provide, support, and maintain your store ledger dashboard. We do not use your inventory data, customer records, or financial information for marketing purposes, nor do we disclose it to third parties.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">3. Data Security & Hosting</h2>
            <p>
              All database values are hosted on secure, modern database servers with SSL connections enabled. Standard encryption is applied to keep active ledger records private.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">4. Payment Processing</h2>
            <p>
              Subscription payments are processed securely by Razorpay. CoinTrace does not store or process card numbers, UPI PINs, or net banking passwords directly. All details are collected directly by Razorpay in compliance with Payment Card Industry Data Security Standards (PCI-DSS).
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">5. Contact Us</h2>
            <p>
              If you have any questions or data deletion requests, you can email us at <a href="mailto:sanjaiprakash075@gmail.com" className="text-indigo-400 hover:underline">sanjaiprakash075@gmail.com</a>.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
