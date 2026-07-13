import Link from 'next/link';
import { ArrowLeft, RefreshCcw } from 'lucide-react';

export default function RefundPage() {
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
              <RefreshCcw className="h-6 w-6 text-indigo-400" />
              Refund & Cancellation Policy
            </h1>
            <p className="text-xs text-gray-400">Last updated: June 2026</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-6 text-sm text-gray-300 leading-relaxed">
          
          <p>
            At CoinTrace, customer satisfaction is our top priority. We want you to feel confident using our ledger and billing services. Our refund and cancellation policies are outlined below:
          </p>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">1. Subscriptions Cancellation</h2>
            <p>
              You can cancel your paid subscription plan (One Shop, Two Shops, or Unlimited Shops) at any time. To cancel, go to your Shop Dashboard, visit Settings/Billing, and click **Cancel Subscription**. Once cancelled:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your plan will remain active until the end of the current billing cycle.</li>
              <li>You will not be charged for the following billing cycle.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">2. Refund Eligibility</h2>
            <p>
              We offer a **7-day money-back guarantee** for all new subscription signups:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>If you request a cancellation within 7 days of your initial payment, you are eligible for a full refund.</li>
              <li>Renewals and subsequent monthly charges are non-refundable.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">3. Processing Refunds</h2>
            <p>
              To request a refund, please send an email to <a href="mailto:sanjaiprakash075@gmail.com" className="text-indigo-400 hover:underline">sanjaiprakash075@gmail.com</a> containing:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your billing account email.</li>
              <li>The Razorpay payment reference ID.</li>
              <li>Reason for cancellation.</li>
            </ul>
            <p className="pt-2">
              Approved refunds will be processed and credited back to your original payment method (bank account, UPI, card) within **5 to 7 business days** in accordance with standard Razorpay settlement procedures.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
