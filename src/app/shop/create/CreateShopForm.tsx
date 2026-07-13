'use client';

import { useState, useTransition } from 'react';
import { createShop } from '@/app/actions/shop';

export default function CreateShopForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const res = await createShop(formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl">
      <h1 className="text-3xl font-black text-center text-gray-100">Create a New Shop</h1>
      <p className="text-center text-sm text-gray-400">
        Give your new shop a name. You will be the owner.
      </p>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold rounded-xl text-center">
          ⚠️ {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-xs font-semibold text-gray-400">
            Shop Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            disabled={isPending}
            placeholder="e.g., My Awesome Store"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20 flex justify-center items-center cursor-pointer"
        >
          {isPending ? 'Creating...' : 'Create Shop'}
        </button>
      </form>
    </div>
  );
}
