'use client';

import { useState, useTransition, useMemo } from 'react';
import { Search, ShieldAlert, Check, Plus, Minus, Layers, EyeOff, Trash2, RotateCcw, ClipboardList } from 'lucide-react';
import { updateProductStock, deleteProduct, unarchiveProduct } from '@/app/actions/kirana';
import { useTranslations } from 'next-intl';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  barcode: string | null;
  stock: number | null;
  archived: boolean;
}

interface StockLogItem {
  id: string;
  productName: string;
  staffName: string;
  oldStock: number | null;
  newStock: number | null;
  change: number;
  createdAt: string;
}

export default function ProductsDashboardClient({
  shopId,
  initialProducts,
  initialLogs = [],
}: {
  shopId: string;
  initialProducts: ProductItem[];
  initialLogs?: StockLogItem[];
}) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'untracked' | 'archived' | 'logs'>('all');
  const [, startTransition] = useTransition();

  // State to hold local updates to stock values (so typing doesn't refresh layout immediately)
  const [localStock, setLocalStock] = useState<Record<string, string>>({});
  // Track which product is currently saving
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Sub-filter for audit logs tab
  const [logFilter, setLogFilter] = useState<'all' | 'increased' | 'decreased'>('all');

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (logFilter === 'increased') return log.change > 0;
      if (logFilter === 'decreased') return log.change < 0;
      return true;
    });
  }, [initialLogs, logFilter]);

  // Compute final filtered products list
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      // 1. Search Query filter
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.barcode && p.barcode.includes(searchQuery));
      
      if (!matchesSearch) return false;

      // 2. Stock Status Tab filter
      if (activeTab === 'archived') {
        return p.archived;
      }

      // If it is archived, hide it from other lists
      if (p.archived) return false;

      if (activeTab === 'low') {
        return p.stock !== null && p.stock < 5;
      }
      if (activeTab === 'out') {
        return p.stock !== null && p.stock <= 0;
      }
      if (activeTab === 'untracked') {
        return p.stock === null;
      }
      return true; // 'all'
    });
  }, [initialProducts, searchQuery, activeTab]);

  const handleStockUpdate = (productId: string, stockValStr: string) => {
    setSavingProductId(productId);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('shopId', shopId);
      formData.append('productId', productId);
      formData.append('stock', stockValStr);

      try {
        await updateProductStock(formData);
        // Clear local input state on success
        setLocalStock((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      } catch (err) {
        console.error('Failed to update stock:', err);
      } finally {
        setSavingProductId(null);
      }
    });
  };

  const handleIncrement = (product: ProductItem, delta: number) => {
    const currentStockVal = localStock[product.id] !== undefined
      ? Number(localStock[product.id])
      : (product.stock ?? 0);

    const nextVal = Math.max(0, currentStockVal + delta);
    setLocalStock((prev) => ({
      ...prev,
      [product.id]: String(nextVal),
    }));
  };

  // State for custom popup card confirmation modal
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  const executeDelete = (productId: string) => {
    setSavingProductId(productId);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('shopId', shopId);
      formData.append('productId', productId);
      try {
        const res = await deleteProduct(formData);
        if (res?.error) {
          alert(res.error);
        }
      } catch (err) {
        console.error('Failed to delete product:', err);
      } finally {
        setSavingProductId(null);
      }
    });
  };

  const executeUnarchive = (productId: string) => {
    setSavingProductId(productId);
    startTransition(async () => {
      const formData = new FormData();
      formData.append('shopId', shopId);
      formData.append('productId', productId);
      try {
        const res = await unarchiveProduct(formData);
        if (res?.error) {
          alert(res.error);
        }
      } catch (err) {
        console.error('Failed to unarchive product:', err);
      } finally {
        setSavingProductId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Tabs Controls */}
      <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200">
            {t('products.title')} ({initialProducts.length})
          </h2>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Tab Switchers */}
        <div className="flex flex-wrap gap-2 border-t border-gray-800 pt-3">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveTab('low')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'low'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Low Stock
          </button>
          <button
            onClick={() => setActiveTab('out')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'out'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Out of Stock
          </button>
          <button
            onClick={() => setActiveTab('untracked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'untracked'
                ? 'bg-gray-700 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Untracked
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'archived'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Archived
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Product Dashboard Grid Table or Audit Logs */}
      <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl">
        {activeTab === 'logs' ? (
          initialLogs.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-10">No stock adjustments logged yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-800/80">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Manual Stock Adjustments</h3>
                </div>
                {/* Log Sub-filters */}
                <div className="flex gap-1 bg-gray-900/60 p-0.5 rounded-lg border border-gray-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setLogFilter('all')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                      logFilter === 'all'
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter('increased')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      logFilter === 'increased'
                        ? 'bg-emerald-950/80 text-emerald-450 border border-emerald-800/20'
                        : 'text-gray-400 hover:text-emerald-350'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Increased
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter('decreased')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      logFilter === 'decreased'
                        ? 'bg-rose-950/80 text-rose-450 border border-rose-800/20'
                        : 'text-gray-400 hover:text-rose-350'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Decreased
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-800/60 max-h-[500px] overflow-y-auto pr-2">
                {filteredLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">No stock adjustments match this log filter.</p>
                ) : (
                  filteredLogs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const isReduction = log.change < 0;

                    return (
                      <div key={log.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                        <div className="space-y-1">
                          <p className="text-gray-300 font-medium">
                            <span className="font-bold text-gray-100">{log.staffName}</span>
                            {' '}manually{' '}
                            <span className={`font-black ${isReduction ? 'text-red-500' : 'text-green-500'}`}>
                              {isReduction ? 'decreased' : 'increased'}
                            </span>
                            {' '}<span className="font-bold text-indigo-300">{log.productName}</span>
                            {' '}by{' '}
                            <span className="font-extrabold">{Math.abs(log.change)}</span> items
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Stock changed from <span className="font-semibold text-gray-400">{log.oldStock ?? 'Unlimited'}</span> to <span className="font-semibold text-gray-400">{log.newStock ?? 'Unlimited'}</span>
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 md:text-right shrink-0">
                          {formattedDate}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No products match your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Product Name</th>
                  <th className="pb-3">Selling Price</th>
                  <th className="pb-3">Stock Level</th>
                  <th className="pb-3 text-right pr-4">Quick Adjust Stock</th>
                  <th className="pb-3 text-center pr-2 w-16">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredProducts.map((p) => {
                  const typedVal = localStock[p.id];
                  const hasLocalChanges = typedVal !== undefined;
                  const isCurrentSaving = savingProductId === p.id;
                  const finalStockVal = hasLocalChanges ? typedVal : String(p.stock ?? '');

                  return (
                    <tr key={p.id} className="hover:bg-gray-900/30 transition-colors">
                      {/* Name & Barcode */}
                      <td className="py-4 pl-2">
                        <span className="font-bold text-sm text-gray-200 block max-w-xs truncate">{p.name}</span>
                        {p.barcode && (
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                            🏷️ Barcode: {p.barcode}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-4 font-extrabold text-sm text-emerald-400">
                        ₹{p.sellingPrice.toFixed(2)}
                      </td>

                      {/* Current Stock Badging */}
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.archived
                            ? 'bg-amber-500/10 text-amber-500/80 border border-amber-500/20'
                            : p.stock === null 
                              ? 'bg-gray-900/60 text-gray-500 border border-gray-800' 
                              : p.stock <= 0 
                                ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' 
                                : p.stock < 5 
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                  : 'bg-indigo-500/10 text-indigo-350 border border-indigo-500/20'
                        }`}>
                          {p.archived ? 'Archived' : p.stock === null ? 'Untracked' : p.stock <= 0 ? 'Out of Stock' : `${p.stock} left`}
                        </span>
                      </td>

                      {/* Interactive Adjustment Form */}
                      <td className="py-4 text-right pr-4">
                        {p.archived ? (
                          <span className="text-[11px] text-gray-500 font-bold tracking-tight pr-6 select-none uppercase">Locked</span>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {/* Minus Button */}
                            <button
                              type="button"
                              onClick={() => handleIncrement(p, -1)}
                              disabled={isCurrentSaving}
                              className="p-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-40 active:scale-95"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            {/* Dynamic Numeric Input */}
                            <input
                              type="number"
                              min="0"
                              placeholder="Unlimited"
                              value={finalStockVal}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLocalStock((prev) => ({ ...prev, [p.id]: v }));
                              }}
                              disabled={isCurrentSaving}
                              className="w-18 text-center px-2 py-1 bg-gray-900 border border-gray-750 focus:border-indigo-500 rounded-lg text-xs font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            {/* Plus Button */}
                            <button
                              type="button"
                              onClick={() => handleIncrement(p, 1)}
                              disabled={isCurrentSaving}
                              className="p-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-40 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>

                            {/* Update/Save Button */}
                            <button
                              type="button"
                              onClick={() => handleStockUpdate(p.id, finalStockVal)}
                              disabled={isCurrentSaving || (!hasLocalChanges && p.stock === (finalStockVal === '' ? null : Number(finalStockVal)))}
                              className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                                isCurrentSaving
                                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                  : hasLocalChanges
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-md shadow-emerald-950/20'
                                    : 'bg-gray-900 text-gray-500 border border-gray-800 hover:bg-gray-800 cursor-pointer'
                              }`}
                            >
                              {isCurrentSaving ? (
                                <div className="h-3.5 w-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Set
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Delete / Restore Action */}
                      <td className="py-4 text-center pr-2">
                        {p.archived ? (
                          <button
                            type="button"
                            onClick={() => executeUnarchive(p.id)}
                            disabled={savingProductId === p.id}
                            className="p-2 bg-gray-950 hover:bg-emerald-950 border border-gray-800 hover:border-emerald-500/40 text-gray-500 hover:text-emerald-400 rounded-xl transition-all cursor-pointer disabled:opacity-40 active:scale-95"
                            title={`Restore ${p.name}`}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setProductToDelete({ id: p.id, name: p.name })}
                            disabled={savingProductId === p.id}
                            className="p-2 bg-gray-950 hover:bg-rose-950 border border-gray-800 hover:border-rose-500/40 text-gray-550 hover:text-rose-450 rounded-xl transition-all cursor-pointer disabled:opacity-40 active:scale-95"
                            title={`Delete ${p.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Custom Delete Confirmation Popup Card */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-gray-850 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-extrabold text-gray-100">Delete Product</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-gray-250">&quot;{productToDelete.name}&quot;</span>? This will permanently delete this product and all associated sales records.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = productToDelete.id;
                  setProductToDelete(null);
                  executeDelete(targetId);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 shadow-md shadow-rose-950/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
