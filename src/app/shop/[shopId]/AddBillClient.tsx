'use client';

import { useState, useTransition, useMemo, useRef, useEffect } from 'react';
import { recordSale } from '@/app/actions/kirana';
import { useTranslations } from 'next-intl';
import { useShopStore } from '@/store/useShopStore';
import { Plus, Minus, Search, CheckCircle, ShoppingCart, Camera, X } from 'lucide-react';
import { ENABLE_CREDIT_CUSTOMER } from '@/lib/features';
import { Html5Qrcode } from 'html5-qrcode';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  barcode: string | null;
  stock: number | null;
}

interface CustomerItem {
  id: string;
  name: string;
  runningBalance: number;
}

export default function AddBillClient({
  shopId,
  products,
  customers,
}: {
  shopId: string;
  products: ProductItem[];
  customers: CustomerItem[];
}) {
  const t = useTranslations();
  const activeWorker = useShopStore((state) => state.activeWorker);

  const [saleType, setSaleType] = useState<'CASH' | 'UPI' | 'CREDIT'>('CASH');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state: map of productId -> quantity
  const [cart, setCart] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Scanning states & refs
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const startPromiseRef = useRef<Promise<unknown> | null>(null);
  const lastScanRef = useRef<{ code: string; time: number } | null>(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 850; // Super sharp store checkout sound
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.1); // Duration 100ms
    } catch (e) {
      console.error("Audio fail", e);
    }
  };

  // Initialize camera scanner when isScanning is toggled true
  useEffect(() => {
    if (!isScanning) {
      return;
    }

    setScanError(null);
    setScanMessage(null);

    const timer = setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("billingQrReader");
        qrCodeRef.current = scanner;

        const startPromise = scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              // Maximized scanning window: 320px wide by 180px tall
              return {
                width: Math.min(width * 0.85, 320),
                height: Math.min(height * 0.55, 180)
              };
            }
          },
          (decodedText) => {
            // Debounce logic (prevent duplicate fast scans of the same code within 1.5 seconds)
            const now = Date.now();
            if (lastScanRef.current && lastScanRef.current.code === decodedText && now - lastScanRef.current.time < 1500) {
              return;
            }
            lastScanRef.current = { code: decodedText, time: now };

            // Look up product
            const matched = products.find(p => p.barcode === decodedText);
            if (matched) {
              const errResult = addToCart(matched.id);
              if (errResult) {
                setScanError(errResult);
                setScanMessage(null);
              } else {
                playBeep();
                setScanError(null);
                setScanMessage(`Added ${matched.name} to cart!`);
                // Fade success message after 1.2s
                setTimeout(() => setScanMessage(null), 1200);
              }
            } else {
              setScanError(`Barcode not found in catalog: ${decodedText}`);
              setScanMessage(null);
            }
          },
          () => {}
        );

        startPromiseRef.current = startPromise;

        startPromise
          .then(() => {
            try {
              const runningTrackGetter = (scanner as unknown as { getRunningTrack?: () => MediaStreamTrack }).getRunningTrack;
              if (runningTrackGetter) {
                const track = runningTrackGetter.call(scanner);
                if (track && typeof track.getCapabilities === "function") {
                  const capabilities = (track as unknown as { getCapabilities: () => Record<string, unknown> }).getCapabilities();
                  if (capabilities.focusMode && Array.isArray(capabilities.focusMode) && capabilities.focusMode.includes("continuous")) {
                    track.applyConstraints({
                      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet]
                    }).catch(() => {});
                  }
                }
              }
            } catch (e) {
              console.warn("Autofocus constraint fallback:", e);
            }
          })
          .catch((err) => {
            console.error("Camera fail:", err);
            setScanError("Camera failed to start. Please grant camera permission.");
          });

      } catch (err) {
        console.error("Scanner setup fail:", err);
        setScanError("Scanner failed to initialize.");
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      const scanner = qrCodeRef.current;
      if (scanner) {
        qrCodeRef.current = null;
        if (startPromiseRef.current) {
          startPromiseRef.current.then(() => {
            if (scanner.isScanning) scanner.stop().catch(console.error);
          }).catch(() => {});
        } else if (scanner.isScanning) {
          scanner.stop().catch(console.error);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, products]);

  const handleCloseScan = async () => {
    setIsScanning(false);
    const scanner = qrCodeRef.current;
    if (scanner) {
      qrCodeRef.current = null;
      if (startPromiseRef.current) {
        try {
          await startPromiseRef.current;
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch (e) {
          console.error(e);
        } finally {
          startPromiseRef.current = null;
        }
      } else if (scanner.isScanning) {
        await scanner.stop().catch(console.error);
      }
    }
  };

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  // Map product details for easy retrieval
  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Cart summary calculations
  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const prod = productMap.get(productId);
        return prod ? { ...prod, quantity } : null;
      })
      .filter(Boolean) as Array<ProductItem & { quantity: number }>;
  }, [cart, productMap]);

  const totalAmount = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity * item.sellingPrice, 0);
  }, [cartItems]);

  const addToCart = (productId: string): string | null => {
    const prod = productMap.get(productId);
    if (!prod) return "Product not found";

    const currentQtyInCart = cart[productId] || 0;
    if (prod.stock !== null && currentQtyInCart >= prod.stock) {
      const err = `Cannot add. "${prod.name}" has only ${prod.stock} items in stock.`;
      setMessage(`⚠️ ${err}`);
      return err;
    }

    setMessage(null);
    setCart((prev) => ({
      ...prev,
      [productId]: currentQtyInCart + 1,
    }));
    return null;
  };

  const updateQuantity = (productId: string, delta: number) => {
    const prod = productMap.get(productId);
    if (!prod) return;

    setCart((prev) => {
      const currentQty = prev[productId] || 0;
      const nextQty = currentQty + delta;
      
      if (delta > 0 && prod.stock !== null && nextQty > prod.stock) {
        setMessage(`⚠️ Cannot increase quantity. Only ${prod.stock} items of "${prod.name}" are in stock.`);
        return prev;
      }
      
      setMessage(null);
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: nextQty };
    });
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (saleType === 'CREDIT' && !selectedCustomerId) {
      setMessage(t('sales.selectCustomer'));
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const payload = {
          shopId,
          type: saleType,
          customerId: saleType === 'CREDIT' ? selectedCustomerId : null,
          workerId: activeWorker?.id || null,
          workerName: activeWorker?.name || null,
          items: cartItems.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            price: item.sellingPrice,
          })),
        };

        const result = await recordSale(payload);
        if (result.success) {
          setCart({});
          setSelectedCustomerId('');
          setMessage(t('sales.saleRecorded'));

          // Voice receipt confirmation
          try {
            const isTamil = document.documentElement.lang === 'ta';
            const msgText = isTamil ? 'விற்பனை பதிவு செய்யப்பட்டது' : 'Sales recorded';
            const utterance = new SpeechSynthesisUtterance(msgText);
            utterance.lang = isTamil ? 'ta-IN' : 'en-US';
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.error('Audio announcement failed:', e);
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error recording sale';
        setMessage(errorMsg);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left panel: Product Selection grid */}
      <div className="lg:col-span-7 space-y-4 min-w-0">
        {/* Payment Type Toggle Selector */}
        <div className={`grid gap-2 bg-gray-900/80 p-1.5 rounded-lg border border-gray-700 ${
          ENABLE_CREDIT_CUSTOMER ? 'grid-cols-3' : 'grid-cols-2'
        }`}>
          <button
            type="button"
            onClick={() => setSaleType('CASH')}
            className={`py-3 text-sm font-bold rounded-md transition-all active:scale-95 ${
              saleType === 'CASH'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💵 {t('sales.cashSale')}
          </button>
          <button
            type="button"
            onClick={() => setSaleType('UPI')}
            className={`py-3 text-sm font-bold rounded-md transition-all active:scale-95 ${
              saleType === 'UPI'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📱 {t('sales.upiSale')}
          </button>
          {ENABLE_CREDIT_CUSTOMER && (
            <button
              type="button"
              onClick={() => setSaleType('CREDIT')}
              className={`py-3 text-sm font-bold rounded-md transition-all active:scale-95 ${
                saleType === 'CREDIT'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              💳 {t('sales.creditSale')}
            </button>
          )}
        </div>

        {/* Customer Select (If credit sale) */}
        {saleType === 'CREDIT' && (
          <div className="p-4 bg-gray-800 border border-amber-900/30 rounded-lg space-y-2">
            <label className="block text-xs font-semibold text-amber-300">
              {t('sales.selectCustomer')} *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-md focus:border-amber-500 focus:outline-none text-sm"
            >
              <option value="">-- {t('sales.selectCustomer')} --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Balance: ₹{c.runningBalance.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Product Search and Scan */}
        <div className="w-full flex items-center bg-gray-800 border border-gray-700/80 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all shadow-inner px-3.5 py-1.5">
          <Search className="h-4.5 w-4.5 text-gray-400 shrink-0 mr-2.5" />
          <input
            type="text"
            placeholder={t('sales.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-sm text-white placeholder-gray-500 min-w-0"
          />
          <button
            type="button"
            onClick={() => setIsScanning(true)}
            className="ml-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer shrink-0 font-bold text-xs shadow-md shadow-indigo-950/20"
            title="Scan Barcode"
          >
            <Camera className="h-4 w-4" />
            <span>Scan</span>
          </button>
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">{t('sales.noProducts')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] pr-2">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p.id)}
                className={`p-4 bg-gray-800 hover:bg-gray-750 border rounded-lg flex flex-col justify-between text-left transition-all active:scale-95 group ${
                  p.stock !== null && p.stock <= 0
                    ? 'opacity-40 border-gray-850 hover:border-gray-850 cursor-not-allowed'
                    : 'border-gray-700 hover:border-indigo-500/50'
                }`}
                disabled={p.stock !== null && p.stock <= 0}
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-100 group-hover:text-white line-clamp-2 text-sm">
                    {p.name}
                  </span>
                  <span className={`text-[10px] mt-1 font-bold ${
                    p.stock === null 
                      ? 'text-gray-500 font-normal' 
                      : p.stock <= 0 
                        ? 'text-rose-450 font-extrabold' 
                        : p.stock < 5 
                          ? 'text-amber-400 font-extrabold' 
                          : 'text-indigo-400'
                  }`}>
                    {p.stock === null ? 'Untracked' : p.stock <= 0 ? 'Out of Stock' : `${p.stock} left`}
                  </span>
                </div>
                <span className="mt-2 text-xs font-bold text-emerald-400">
                  ₹{p.sellingPrice.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right panel: Checkout Cart Summary */}
      <div className="lg:col-span-5 bg-gray-800/60 border border-gray-700/80 rounded-xl p-5 flex flex-col justify-between shadow-xl backdrop-blur-md min-w-0">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-700 pb-3">
            <ShoppingCart className="h-5 w-5 text-indigo-400" />
            <h3 className="font-bold text-gray-200">
              Cart Summary
            </h3>
            {activeWorker && (
              <span className="ml-auto text-xs px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full">
                👤 {activeWorker.name}
              </span>
            )}
          </div>

          {/* Cart items list */}
          {cartItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-500">
                <ShoppingCart className="h-6 w-6 text-indigo-450" />
              </div>
              <p className="text-xs text-gray-450 font-bold leading-relaxed max-w-[200px]">
                Cart is empty. <br />Tap products above to add.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-gray-900/40 rounded-lg border border-gray-850"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-sm text-gray-200 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">₹{item.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1.5 bg-gray-700 hover:bg-gray-650 text-white rounded-md transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="font-bold text-sm w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1.5 bg-gray-700 hover:bg-gray-650 text-white rounded-md transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart total & action */}
        <div className="mt-6 border-t border-gray-750 pt-4 space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-gray-400">{t('sales.totalAmount')}</span>
            <span className="text-2xl font-extrabold text-emerald-400">
              ₹{totalAmount.toFixed(2)}
            </span>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                message === t('sales.saleRecorded')
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800'
              }`}
            >
              {message === t('sales.saleRecorded') && <CheckCircle className="h-4 w-4 shrink-0" />}
              {message}
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isPending || cartItems.length === 0}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20"
          >
            {isPending ? t('common.loading') : t('sales.recordSale')}
          </button>
        </div>
      </div>

      {/* Barcode Camera Modal overlay for billing */}
      {isScanning && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 relative flex flex-col">
            
            <button
              onClick={handleCloseScan}
              className="absolute top-4 right-4 p-2 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-1.5 text-center">
              <h3 className="font-extrabold text-lg text-gray-100 flex items-center justify-center gap-2">
                <Camera className="h-5 w-5 text-indigo-400" />
                Scan Items to Bill
              </h3>
              <p className="text-xs text-gray-400 leading-normal px-4">
                Point camera at barcodes. The app will beep and auto-add items to the cart.
              </p>
            </div>

            {/* Video container */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-gray-800 relative flex justify-center items-center shadow-inner">
              <div id="billingQrReader" className="w-full h-full object-cover"></div>
              {/* Laser line overlay */}
              <div className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse pointer-events-none" style={{ top: '50%' }}></div>
            </div>

            {/* Scan success message banner */}
            {scanMessage && (
              <p className="text-center text-xs text-emerald-300 font-extrabold bg-emerald-500/10 border border-emerald-500/20 py-2.5 px-4 rounded-xl animate-bounce">
                ✅ {scanMessage}
              </p>
            )}

            {/* Scan error warning banner */}
            {scanError && (
              <p className="text-center text-xs text-rose-300 font-semibold bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl">
                ⚠️ {scanError}
              </p>
            )}

            <button
              onClick={handleCloseScan}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/20 cursor-pointer text-sm"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
