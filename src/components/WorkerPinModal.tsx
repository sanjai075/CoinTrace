'use client';

import { useState, useTransition } from 'react';
import { verifyWorkerPin } from '@/app/actions/kirana';
import { useShopStore } from '@/store/useShopStore';
import { useTranslations } from 'next-intl';
import { KeyRound, Lock, UserCheck, X } from 'lucide-react';

interface WorkerItem {
  id: string;
  name: string;
}

export default function WorkerPinModal({
  workers,
  onClose,
}: {
  workers: WorkerItem[];
  onClose?: () => void;
}) {
  const t = useTranslations();
  const setActiveWorker = useShopStore((state) => state.setActiveWorker);
  const activeWorker = useShopStore((state) => state.activeWorker);

  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleVerify = () => {
    if (!selectedWorkerId || pin.length !== 4) return;

    setError(null);
    startTransition(async () => {
      const result = await verifyWorkerPin(selectedWorkerId, pin);
      if (result.success && result.worker) {
        setActiveWorker(result.worker);
        setPin('');
        if (onClose) onClose();
      } else {
        setPin('');
        setError(t('workers.invalidPin'));
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-gray-700/80 rounded-3xl p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-indigo-400" />
            <h3 className="font-extrabold text-gray-100">{t('workers.title')}</h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Worker Select */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400">
            {t('workers.selectWorker')} *
          </label>
          <select
            value={selectedWorkerId}
            onChange={(e) => {
              setSelectedWorkerId(e.target.value);
              setPin('');
              setError(null);
            }}
            className="w-full px-4 py-3 bg-gray-950 border border-gray-750 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-white"
          >
            <option value="">-- {t('workers.selectWorker')} --</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                👤 {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* PIN dots display */}
        <div className="flex flex-col items-center gap-2">
          <label className="block text-xs font-bold text-gray-400">
            {t('workers.enterPin')}
          </label>
          <div className="flex gap-4 py-2">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`h-4.5 w-4.5 rounded-full border border-gray-600 transition-all ${
                  pin.length > index ? 'bg-indigo-500 scale-110 shadow-lg shadow-indigo-500/20' : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
          >
            Clear
          </button>
          <button
            onClick={() => handleNumberClick('0')}
            className="py-4 text-lg font-black bg-gray-800/60 hover:bg-gray-750 border border-gray-750 hover:border-gray-600 text-gray-100 rounded-2xl active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-4 text-xs font-bold bg-gray-900 hover:bg-gray-850 text-gray-400 rounded-2xl active:scale-95 transition-all"
          >
            ⌫
          </button>
        </div>

        {error && <p className="text-center text-xs font-semibold text-rose-400">{error}</p>}
        {activeWorker && (
          <p className="text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
            <UserCheck className="h-4 w-4" />
            {t('workers.workerActive', { name: activeWorker.name })}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={isPending || !selectedWorkerId || pin.length !== 4}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20 flex items-center justify-center gap-2"
        >
          <KeyRound className="h-4 w-4" />
          {isPending ? t('common.loading') : t('workers.verify')}
        </button>
      </div>
    </div>
  );
}
