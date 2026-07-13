import Link from 'next/link';
import { ArrowLeft, Mail, Phone, MapPin, Store } from 'lucide-react';

export default function AboutPage() {
  return (
    <main className="min-h-screen p-6 md:p-12 bg-gray-900 text-white flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl space-y-8">
        
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
              <Store className="h-6 w-6 text-indigo-400" />
              About CoinTrace
            </h1>
            <p className="text-xs text-gray-400">Company & Contact Information</p>
          </div>
        </div>

        {/* Content Card */}
        <div className="p-8 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-indigo-300">Our Mission</h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              CoinTrace is a simple, modern billing and credit register app built specifically for small shop owners (Kirana stores) and distributors in India. 
              Our goal is to make business bookkeeping effortless, replacing traditional paper books with a fast, secure, and reliable digital ledger.
            </p>
            <p className="text-sm text-gray-300 leading-relaxed">
              We empower shop owners to manage daily transactions, keep track of wholesale supplier balances, record sales on cash or credit, and oversee staff activities securely.
            </p>
          </div>

          <hr className="border-gray-800" />

          {/* Contact Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-indigo-300">Contact Details</h2>
            <p className="text-xs text-gray-400">Feel free to reach out to us for any queries or support requests.</p>
            
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              <div className="flex items-start gap-3 text-sm text-gray-300">
                <Mail className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-200">Email Support</p>
                  <a href="mailto:sanjaiprakash075@gmail.com" className="text-indigo-400 hover:underline">
                    sanjaiprakash075@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-gray-300">
                <Phone className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-200">Phone Support</p>
                  <p className="text-gray-400">+91 7010455393</p>
                </div>
              </div>

              <div className="flex items-start gap-3 text-sm text-gray-300">
                <MapPin className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-200">Registered Office</p>
                  <p className="text-gray-400 leading-relaxed text-xs">
                    CoinTrace Technologies,<br />
                    Main Road, Coimbatore,<br />
                    Tamil Nadu, India - 641001
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
