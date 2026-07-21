'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { addProductToCatalog } from '@/app/actions/kirana';
import { useTranslations } from 'next-intl';
import { Plus, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function AddProductFormClient({ shopId }: { shopId: string }) {
  const t = useTranslations();
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const startPromiseRef = useRef<Promise<unknown> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize camera scanner when isScanning is toggled true
  useEffect(() => {
    if (!isScanning) {
      return;
    }

    setScanError(null);

    // Give the DOM a tiny frame to mount the #addProductQrReader container
    const timer = setTimeout(() => {
      try {
        const scanner = new Html5Qrcode("addProductQrReader");
        qrCodeRef.current = scanner;

        const startPromise = scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              // Perfect rectangular target box for scanning thin barcodes
              return {
                width: Math.min(width * 0.8, 280),
                height: Math.min(height * 0.4, 110)
              };
            }
          },
          (decodedText) => {
            setBarcode(decodedText);
            handleCloseScan();
          },
          () => {
            // Silence frame scanning errors
          }
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
            console.error("Camera start error:", err);
            setScanError("Failed to access camera. Please verify permission settings.");
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
  }, [isScanning]);

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
        } catch (err) {
          console.error("Failed to stop scanner after startup:", err);
        } finally {
          startPromiseRef.current = null;
        }
      } else if (scanner.isScanning) {
        await scanner.stop().catch(console.error);
      }
    }
  };

  const handleSubmit = (formData: FormData) => {
    setFormError(null);
    startTransition(async () => {
      const res = await addProductToCatalog(formData);
      if (res?.error) {
        setFormError(res.error);
      } else {
        setBarcode('');
        formRef.current?.reset();
      }
    });
  };

  return (
    <div className="p-6 bg-gray-850 border border-gray-800 rounded-2xl shadow-xl space-y-4">
      <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
        <Plus className="h-5 w-5" />
        {t('products.addProduct')}
      </h2>

      {formError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm font-semibold rounded-xl text-center">
          ⚠️ {formError}
        </div>
      )}

      <form ref={formRef} action={handleSubmit} className="space-y-4">
        <input type="hidden" name="shopId" value={shopId} />
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {/* Product Name */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="h-4 block truncate text-xs font-semibold text-gray-400">
              {t('products.productName')} *
            </label>
            <input
              type="text"
              name="name"
              required
              disabled={isPending}
              placeholder="e.g., Bread (ரொட்டி)"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white disabled:opacity-50"
            />
          </div>

          {/* Price */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="h-4 block truncate text-xs font-semibold text-gray-400">
              Price (₹) *
            </label>
            <input
              type="number"
              name="sellingPrice"
              step="0.01"
              min="0"
              required
              disabled={isPending}
              placeholder="e.g., 40.00"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white disabled:opacity-50"
            />
          </div>

          {/* Stock Level (Optional) */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="h-4 block truncate text-xs font-semibold text-gray-400">
              Stock (Opt)
            </label>
            <input
              type="number"
              name="stock"
              min="0"
              disabled={isPending}
              placeholder="e.g., 100"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white disabled:opacity-50"
            />
          </div>

          {/* Barcode input with scan button */}
          <div className="space-y-1.5 sm:col-span-1">
            <label className="h-4 block truncate text-xs font-semibold text-gray-400">
              Barcode (Opt)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                disabled={isPending}
                placeholder="Scan or type barcode"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 focus:border-indigo-500 rounded-xl focus:outline-none text-sm text-white disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setIsScanning(true)}
                disabled={isPending}
                className="px-3.5 bg-indigo-600/10 hover:bg-indigo-600/20 disabled:opacity-50 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                title="Scan with Camera"
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20 cursor-pointer flex justify-center items-center"
        >
          {isPending ? 'Saving...' : t('products.addProduct')}
        </button>
      </form>

      {/* Barcode Camera Modal overlay */}
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
                Scan Product Barcode
              </h3>
              <p className="text-xs text-gray-400 leading-normal px-4">
                Point your camera at the barcode. Keep the package steady.
              </p>
            </div>

            {/* Video container */}
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-gray-800 relative flex justify-center items-center shadow-inner">
              <div id="addProductQrReader" className="w-full h-full object-cover"></div>
              {/* Laser line overlay styling */}
              <div className="absolute left-4 right-4 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse pointer-events-none" style={{ top: '50%' }}></div>
            </div>

            {scanError && (
              <p className="text-center text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 py-2.5 px-4 rounded-xl">
                ⚠️ {scanError}
              </p>
            )}

            <button
              onClick={handleCloseScan}
              className="w-full py-3.5 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white font-bold rounded-xl transition-all border border-gray-750 cursor-pointer text-sm"
            >
              Cancel Scanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
