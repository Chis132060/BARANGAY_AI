"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, X } from "lucide-react";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onCancel: () => void;
}

export default function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "qr-reader";

  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (isMounted) {
              scanner.stop().then(() => {
                onScan(decodedText);
              });
            }
          },
          (err) => {
            // Ignore ongoing read errors as they just mean "no QR detected yet"
          }
        );
        if (isMounted) setLoading(false);
      } catch (err: any) {
        if (isMounted) {
          setError("Failed to start camera. Please check permissions.");
          setLoading(false);
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="relative w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-900 text-white z-10 relative">
        <span className="text-sm font-semibold">Scan Payment QR</span>
        <button onClick={onCancel} className="p-1 rounded-full hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative aspect-[4/5] bg-black">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-red-400 p-6 text-center text-sm z-10">
            {error}
          </div>
        ) : (
          <div id={containerId} className="w-full h-full" />
        )}
      </div>
    </div>
  );
}
