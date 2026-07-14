'use client';

import { useState, useTransition, useMemo } from 'react';
import { Search, ShieldAlert, Check, Plus, Minus, Layers, EyeOff, Trash2, RotateCcw, ClipboardList, Store, X, Loader2, ChevronDown } from 'lucide-react';
import { updateProductStock, deleteProduct, unarchiveProduct, getShopActiveProducts, cloneAllProducts, cloneSelectedProducts } from '@/app/actions/kirana';
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
  myShops = [],
}: {
  shopId: string;
  initialProducts: ProductItem[];
  initialLogs?: StockLogItem[];
  myShops?: Array<{ id: string; name: string }>;
}) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out' | 'untracked' | 'archived' | 'logs'>('all');
  const [, startTransition] = useTransition();

  // State to hold local updates to stock values (so typing doesn't refresh layout immediately)
  const [localStock, setLocalStock] = useState<Record<string, string>>({});
  // Track which product is currently saving
  const [savingProductId, setSavingProductId] = useState<string | null>(null);

  // Import products states
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedSourceShopId, setSelectedSourceShopId] = useState('');
  const [importMethod, setImportMethod] = useState<'all' | 'selected' | null>(null);
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  
  const [sourceProducts, setSourceProducts] = useState<Array<{ id: string; name: string; barcode: string | null; sellingPrice: number }>>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [loadingSourceProducts, setLoadingSourceProducts] = useState(false);
  const [sourceSearchQuery, setSourceSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ message: string; isError: boolean } | null>(null);

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

  // Other shops list for import dropdown
  const otherShops = useMemo(() => myShops.filter((s) => s.id !== shopId), [myShops, shopId]);

  const selectedSourceShop = useMemo(
    () => otherShops.find((s) => s.id === selectedSourceShopId),
    [otherShops, selectedSourceShopId]
  );

  // Load products when source shop is selected
  const handleSourceShopSelect = async (sId: string) => {
    setSelectedSourceShopId(sId);
    setImportMethod(null);
    setSourceProducts([]);
    setSelectedProductIds(new Set());
    setImportNotice(null);

    if (sId) {
      setLoadingSourceProducts(true);
      try {
        const prods = await getShopActiveProducts(sId);
        setSourceProducts(prods);
      } catch (err) {
        console.error('Failed to load source products:', err);
      } finally {
        setLoadingSourceProducts(false);
      }
    }
  };

  // Filter out products already present in the target catalog
  const importableProducts = useMemo(() => {
    const existingNames = new Set(initialProducts.map((p) => p.name.toLowerCase()));
    const existingBarcodes = new Set(initialProducts.map((p) => p.barcode).filter(Boolean));

    return sourceProducts.filter((p) => {
      const nameMatch = existingNames.has(p.name.toLowerCase());
      const barcodeMatch = p.barcode ? existingBarcodes.has(p.barcode) : false;
      return !nameMatch && !barcodeMatch;
    });
  }, [sourceProducts, initialProducts]);

  // Search query within the import checklist
  const filteredImportableProducts = useMemo(() => {
    return importableProducts.filter((p) =>
      p.name.toLowerCase().includes(sourceSearchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(sourceSearchQuery))
    );
  }, [importableProducts, sourceSearchQuery]);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleSelectAll = (filteredProds: typeof sourceProducts) => {
    const allSelected = filteredProds.every((p) => selectedProductIds.has(p.id));
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      filteredProds.forEach((p) => {
        if (allSelected) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const resetModalState = () => {
    setSelectedSourceShopId('');
    setImportMethod(null);
    setSourceProducts([]);
    setSelectedProductIds(new Set());
    setSourceSearchQuery('');
    setImportNotice(null);
    setIsSourceDropdownOpen(false);
  };

  const handleImportAll = async () => {
    if (!selectedSourceShopId) return;
    setIsImporting(true);
    setImportNotice(null);
    try {
      const res = await cloneAllProducts(selectedSourceShopId, shopId);
      if (res.error) {
        setImportNotice({ message: res.error, isError: true });
      } else {
        setImportNotice({ message: `Successfully imported ${res.count} products!`, isError: false });
        setTimeout(() => {
          setShowImportModal(false);
          resetModalState();
        }, 2000);
      }
    } catch (err) {
      setImportNotice({ message: 'Failed to import products.', isError: true });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportSelected = async () => {
    if (!selectedSourceShopId || selectedProductIds.size === 0) return;
    setIsImporting(true);
    setImportNotice(null);
    try {
      const res = await cloneSelectedProducts(selectedSourceShopId, shopId, Array.from(selectedProductIds));
      if (res.error) {
        setImportNotice({ message: res.error, isError: true });
      } else {
        setImportNotice({ message: `Successfully imported ${res.count} products!`, isError: false });
        setTimeout(() => {
          setShowImportModal(false);
          resetModalState();
        }, 2000);
      }
    } catch (err) {
      setImportNotice({ message: 'Failed to import products.', isError: true });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Tabs Controls */}
      <div className="p-5 bg-gray-850 border border-gray-800 rounded-2xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <h2 className="text-lg font-bold text-gray-200">
              {t('products.title')} ({initialProducts.length})
            </h2>
            {otherShops.length > 0 && (
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-indigo-400 hover:text-indigo-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm select-none"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Import from Shop
              </button>
            )}
          </div>

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
        <div className="flex flex-nowrap md:flex-wrap gap-2 border-t border-gray-800 pt-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-900 text-gray-400 hover:text-gray-200 border border-gray-800'
              }`}
          >
            All Products
          </button>
          <button
            onClick={() => setActiveTab('low')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'low'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
              }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Low Stock
          </button>
          <button
            onClick={() => setActiveTab('out')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'out'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
              }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Out of Stock
          </button>
          <button
            onClick={() => setActiveTab('untracked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'untracked'
              ? 'bg-gray-700 text-white shadow-md'
              : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
              }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            Untracked
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'archived'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-900 text-gray-400 hover:text-gray-250 border border-gray-800'
              }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Archived
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${activeTab === 'logs'
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
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${logFilter === 'all'
                      ? 'bg-gray-800 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogFilter('increased')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${logFilter === 'increased'
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
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${logFilter === 'decreased'
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
                <tr className="border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <th className="pb-3 pl-2 pr-4">Product Name</th>
                  <th className="pb-3 px-4">Selling Price</th>
                  <th className="pb-3 px-4">Stock Level</th>
                  <th className="pb-3 px-4 text-center">Quick Adjust Stock</th>
                  <th className="pb-3 px-4 text-center w-16">Remove</th>
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
                      <td className="py-4 pl-2 pr-4">
                        <span className="font-bold text-sm text-gray-200 block max-w-xs truncate">{p.name}</span>
                        {p.barcode && (
                          <span className="text-[10px] text-gray-500 font-mono block mt-0.5">
                            🏷️ Barcode: {p.barcode}
                          </span>
                        )}
                      </td>

                      {/* Selling Price */}
                      <td className="py-4 px-4 font-extrabold text-sm text-emerald-400">
                        ₹{p.sellingPrice.toFixed(2)}
                      </td>

                      {/* Current Stock Badging */}
                      <td className="py-4 align-middle px-4">
                        <div className="flex justify-start">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${p.archived
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
                        </div>
                      </td>

                      {/* Interactive Adjustment Form */}
                      <td className="py-4 px-4 align-middle">
                        {p.archived ? (
                          <div className="text-center"><span className="text-[11px] text-gray-500 font-bold tracking-tight select-none uppercase">Locked</span></div>
                        ) : (
                          <div className="flex justify-center items-center gap-2">
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
                              placeholder="Untracked"
                              value={finalStockVal}
                              onChange={(e) => {
                                const v = e.target.value;
                                setLocalStock((prev) => ({ ...prev, [p.id]: v }));
                              }}
                              disabled={isCurrentSaving}
                              className="w-24 text-center px-2 py-1 bg-gray-900 border border-gray-750 focus:border-indigo-500 rounded-lg text-xs font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                              className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isCurrentSaving
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
                      <td className="py-4 px-4 text-center">
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

      {/* Import Catalog Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-850 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col min-h-[280px] max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-gray-100">Import Products</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  resetModalState();
                }}
                className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 min-h-[200px]">
              {importNotice && (
                <div className={`p-3.5 rounded-xl text-xs font-semibold ${
                  importNotice.isError ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                }`}>
                  {importNotice.message}
                </div>
              )}

              {/* Step 1: Select Source Shop */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                  Select Source Shop
                </label>
                
                {/* Custom Shop Dropdown Selector */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => !isImporting && setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                    disabled={isImporting}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-750 hover:border-gray-700 disabled:opacity-50 text-white rounded-xl flex items-center justify-between text-xs font-semibold transition-all cursor-pointer select-none"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Store className="h-4 w-4 text-indigo-400 shrink-0" />
                      <span className="truncate">
                        {selectedSourceShop?.name || '-- Choose Shop --'}
                      </span>
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 shrink-0 ${isSourceDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isSourceDropdownOpen && (
                    <>
                      {/* Backdrop to close dropdown click-away */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsSourceDropdownOpen(false)}
                      />
                      
                      {/* Dropdown Options Box */}
                      <div className="absolute left-0 right-0 mt-1.5 z-20 bg-gray-900 border border-gray-800 rounded-xl shadow-xl overflow-hidden py-1 divide-y divide-gray-800/40 max-h-48 overflow-y-auto">
                        {otherShops.length === 0 ? (
                          <div className="px-3.5 py-2 text-xs text-gray-500">No other shops available.</div>
                        ) : (
                          otherShops.map((s) => {
                            const isSelected = s.id === selectedSourceShopId;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  handleSourceShopSelect(s.id);
                                  setIsSourceDropdownOpen(false);
                                }}
                                className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-indigo-600/15 text-indigo-300' 
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                              >
                                <span className="truncate pr-4">{s.name}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {selectedSourceShopId && (
                <>
                  {loadingSourceProducts ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
                      <p className="text-xs text-gray-500">Loading products catalog...</p>
                    </div>
                  ) : sourceProducts.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">This shop has no products in its catalog.</p>
                  ) : importableProducts.length === 0 ? (
                    <p className="text-xs text-emerald-450 text-center py-6 font-semibold bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                      🎉 All products from this shop already exist in your current catalog!
                    </p>
                  ) : (
                    <>
                      {/* Step 2: Choose Method */}
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                          Import Method
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setImportMethod('all')}
                            disabled={isImporting}
                            className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer ${
                              importMethod === 'all'
                                ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                            }`}
                          >
                            <p className="text-xs font-bold">Import All Products</p>
                            <p className="text-[10px] text-gray-500 mt-1">Clones all {importableProducts.length} new items at once.</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportMethod('selected')}
                            disabled={isImporting}
                            className={`p-3.5 border rounded-xl text-left transition-all cursor-pointer ${
                              importMethod === 'selected'
                                ? 'bg-indigo-600/10 border-indigo-500 text-indigo-300'
                                : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                            }`}
                          >
                            <p className="text-xs font-bold">Select Specific Products</p>
                            <p className="text-[10px] text-gray-500 mt-1">Choose exactly which products to import from a checklist.</p>
                          </button>
                        </div>
                      </div>

                      {/* Option A: Import All */}
                      {importMethod === 'all' && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleImportAll}
                            disabled={isImporting}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Import All {importableProducts.length} Products
                          </button>
                        </div>
                      )}

                      {/* Option B: Selective Checklist */}
                      {importMethod === 'selected' && (
                        <div className="space-y-3 pt-2">
                          {/* List Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-500" />
                            <input
                              type="text"
                              placeholder="Search products to import..."
                              value={sourceSearchQuery}
                              onChange={(e) => setSourceSearchQuery(e.target.value)}
                              disabled={isImporting}
                              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:border-indigo-500 focus:outline-none text-xs text-white placeholder-gray-500"
                            />
                          </div>

                          {/* Selection Summary and Select All */}
                          <div className="flex items-center justify-between text-xs px-1">
                            <span className="text-gray-400 font-medium">
                              Selected: <span className="font-bold text-indigo-400">{selectedProductIds.size}</span> / {importableProducts.length}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSelectAll(filteredImportableProducts)}
                              disabled={isImporting || filteredImportableProducts.length === 0}
                              className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {filteredImportableProducts.every((p) => selectedProductIds.has(p.id)) ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>

                          {/* Checklist Container */}
                          <div className="border border-gray-800 rounded-xl overflow-hidden divide-y divide-gray-800 bg-gray-900/40 max-h-48 overflow-y-auto">
                            {filteredImportableProducts.length === 0 ? (
                              <p className="text-xs text-gray-500 text-center py-8">No matching new products found.</p>
                            ) : (
                              filteredImportableProducts.map((p) => {
                                const isChecked = selectedProductIds.has(p.id);
                                return (
                                  <label
                                    key={p.id}
                                    className={`px-3 py-2.5 flex items-center justify-between transition-colors select-none text-xs font-bold cursor-pointer ${
                                      isChecked ? 'bg-indigo-500/5 text-indigo-300' : 'text-gray-300 hover:bg-gray-800/40 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleProductSelection(p.id)}
                                        disabled={isImporting}
                                        className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                                      />
                                      <div className="truncate">
                                        <span className="block truncate">{p.name}</span>
                                        {p.barcode && <span className="block text-[9px] text-gray-500 font-mono font-normal mt-0.5">🏷️ {p.barcode}</span>}
                                      </div>
                                    </div>
                                    <span className="text-emerald-400 shrink-0 font-extrabold text-[11px] font-mono">₹{p.sellingPrice.toFixed(2)}</span>
                                  </label>
                                );
                              })
                            )}
                          </div>

                          {/* Import Action Button */}
                          <button
                            type="button"
                            onClick={handleImportSelected}
                            disabled={isImporting || selectedProductIds.size === 0}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            Import Selected Products ({selectedProductIds.size})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
