'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Register PWA Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('Service Worker registered successfully:', reg.scope))
        .catch((err) => console.error('Service Worker registration failed:', err));
    }

    // 2. Intercept native install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA install prompt');
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 p-4 bg-slate-800/90 border border-indigo-500/40 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-3 transition-all animate-bounce">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/20">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-gray-100">Install CoinTrace</h4>
          <p className="text-xs text-gray-400">
            Add this register app to your Android home screen for quick offline access.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setShowPrompt(false)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          Not Now
        </button>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all active:scale-[0.97]"
        >
          Install App
        </button>
      </div>
    </div>
  );
}
