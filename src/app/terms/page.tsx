import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
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
              <FileText className="h-6 w-6 text-indigo-400" />
              Terms & Conditions
            </h1>
            <p className="text-xs text-gray-400">Last updated: June 2026</p>
          </div>
        </div>

        {/* Policy Content */}
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-6 text-sm text-gray-300 leading-relaxed">
          
          <p>
            Welcome to CoinTrace. By using our website (`http://localhost:3000` or our live domain) and our store register features, you agree to comply with the following Terms and Conditions:
          </p>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">1. Account Registration & Safety</h2>
            <p>
              Users must sign in via StackAuth to access store registries. You are responsible for keeping your login credentials and device PINs secure. CoinTrace is not liable for unauthorized access resulting from shared device keys or weak PIN configurations.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">2. Usage Rules</h2>
            <p>
              You agree to use CoinTrace solely to record business sales, inventory, and supply transactions. You may not exploit the server system, run automated scraping bots, or perform raw SQL injections against our database nodes.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">3. Subscriptions & Fees</h2>
            <p>
              Paid plans (such as One Shop, Two Shops, and Unlimited Shop packages) are billed monthly. Prices are explicitly listed in Indian Rupees (INR) on our Pricing page. Your subscription will renew automatically unless cancelled via your store dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">4. Limitation of Liability</h2>
            <p>
              CoinTrace provides digital bookkeeping tools &quot;as is&quot;. We do not guarantee 100% uptime and are not responsible for any financial discrepancies, tax calculations, or loss of local transaction histories. It is recommended to perform routine exports of your daily sales.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-gray-100">5. Governing Law</h2>
            <p>
              These terms are governed by the laws of India. Any legal disputes arising from using our payment integrations or services fall under the jurisdiction of courts in Tamil Nadu, India.
            </p>
          </div>

        </div>

      </div>
    </main>
  );
}
