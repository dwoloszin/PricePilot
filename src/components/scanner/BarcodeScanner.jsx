import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ onScan, onClose }) {
  const [manualEntry, setManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (manualEntry) return;

    let html5QrCode = null;
    let isMounted = true;

    const startScanner = async () => {
      setIsInitializing(true);
      setError(null);
      
      try {
        // Ensure the element exists in DOM
        const element = document.getElementById("barcode-reader");
        if (!element) {
          throw new Error("Scanner element not found");
        }

        html5QrCode = new Html5Qrcode("barcode-reader");
        scannerRef.current = html5QrCode;
        
        const config = {
          fps: 10,
          qrbox: { width: 280, height: 180 },
          aspectRatio: 1.0,
          // Support common barcodes
          formatsToSupport: [ 
            Html5QrcodeSupportedFormats.EAN_13, 
            Html5QrcodeSupportedFormats.EAN_8, 
            Html5QrcodeSupportedFormats.UPC_A, 
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE
          ]
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success callback
            if (isMounted) {
              // Stop scanner immediately on success
              html5QrCode.stop().then(() => {
                if (isMounted) onScan(decodedText);
              }).catch(err => {
                console.error("Failed to stop scanner after success:", err);
                if (isMounted) onScan(decodedText);
              });
            }
          },
          (errorMessage) => {
            // Continuous scanning error (ignore)
          }
        );

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('Scanner initialization error:', err);
        if (isMounted) {
          setError(err.message || "Could not start camera");
          setIsInitializing(false);
          // Auto-fallback to manual entry if camera fails
          setTimeout(() => {
            if (isMounted) setManualEntry(true);
          }, 3000);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(startScanner, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(err => console.error('Scanner cleanup error:', err));
      }
    };
  }, [manualEntry]);

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[120] p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>
        <span className="text-white font-bold tracking-tight">PricePilot Scanner</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setManualEntry(!manualEntry)}
          className="text-white hover:bg-white/20 rounded-full"
        >
          <Keyboard className="w-5 h-5" />
        </Button>
      </div>

      {!manualEntry ? (
        <div className="relative flex-1 flex flex-col items-center justify-center">
          {/* Scanner Container */}
          <div className="w-full h-full bg-black flex items-center justify-center overflow-hidden">
            <div id="barcode-reader" className="w-full h-full object-cover" />
          </div>

          {/* Overlay UI */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Scan Frame */}
            <div className="w-72 h-48 border-2 border-emerald-500/50 rounded-3xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-2xl -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-2xl -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-2xl -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-2xl -mb-1 -mr-1" />
              
              {/* Animated Scan Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scan-line" />
            </div>
            
            <p className="mt-12 text-white/90 font-medium px-6 py-2 bg-black/40 backdrop-blur-md rounded-full text-sm">
              Align barcode within the frame
            </p>
          </div>

          {/* Loading/Error State */}
          {(isInitializing || error) && (
            <div className="absolute inset-0 bg-black flex flex-col items-center justify-center p-8 text-center">
              {isInitializing ? (
                <>
                  <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                  <p className="text-white font-medium">Initializing camera...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                    <Camera className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Camera Error</h3>
                  <p className="text-slate-400 text-sm mb-6">{error}</p>
                  <Button 
                    onClick={() => setManualEntry(true)}
                    className="bg-white text-black hover:bg-slate-200 rounded-xl px-8"
                  >
                    Enter Manually
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Manual Entry */
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-500/20 flex items-center justify-center">
                <Keyboard className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Manual Entry</h2>
              <p className="text-slate-400 mt-2">
                Type the product barcode manually
              </p>
            </div>
            
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Barcode number..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="h-16 bg-white/10 border-white/10 text-white text-center text-2xl font-bold tracking-[0.2em] placeholder:text-slate-600 rounded-2xl focus:ring-emerald-500/50"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              
              <Button
                onClick={handleManualSubmit}
                disabled={!manualBarcode.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-16 text-lg font-bold rounded-2xl shadow-xl shadow-emerald-500/20"
              >
                Search Product
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setManualEntry(false)}
                className="w-full text-slate-400 hover:text-white h-12"
              >
                <Camera className="w-5 h-5 mr-2" />
                Back to Camera
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
