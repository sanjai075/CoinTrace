'use client';

import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const router = useRouter();
  const currentLocale = useLocale();

  const toggleLanguage = () => {
    const nextLocale = currentLocale === 'ta' ? 'en' : 'ta';
    
    // Set cookie that resolves translation in root layout
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Refresh page to load new dictionary
    router.refresh();
  };

  return (
    <button
      onClick={toggleLanguage}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 transition-all active:scale-95"
      id="lang-switcher-btn"
    >
      🌐 {currentLocale === 'ta' ? 'English' : 'தமிழ்'}
    </button>
  );
}
