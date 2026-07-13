import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WorkerState {
  id: string;
  name: string;
}

interface ShopStore {
  isWorkerMode: boolean;
  activeWorker: WorkerState | null;
  lockPin: string | null;
  setWorkerMode: (enabled: boolean) => void;
  setActiveWorker: (worker: WorkerState | null) => void;
  setLockPin: (pin: string | null) => void;
  clearSession: () => void;
}

export const useShopStore = create<ShopStore>()(
  persist(
    (set) => ({
      isWorkerMode: false,
      activeWorker: null,
      lockPin: null,

      setWorkerMode: (enabled) => set({ isWorkerMode: enabled }),
      setActiveWorker: (worker) => set({ activeWorker: worker }),
      setLockPin: (pin) => set({ lockPin: pin }),
      clearSession: () => set({ activeWorker: null, lockPin: null }),
    }),
    {
      name: 'cointrace-shop-store',
    }
  )
);
