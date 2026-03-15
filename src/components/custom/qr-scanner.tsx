"use client";

import { useEffect, useRef } from "react";

type Props = {
  onScan: (qrCode: string) => void;
  /** Pause scanning while a result is being processed */
  paused?: boolean;
};

export function QrScanner({ onScan, paused }: Props) {
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // M1 fix: keep onScan ref up-to-date so the scanner always calls the latest callback.
  // The useEffect(..., []) below captures refs (not closures), avoiding stale state issues.
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let stopped = false;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      const scanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text: string) => {
            if (!pausedRef.current) onScanRef.current(text);
          },
          undefined
        )
        .catch((err: unknown) => console.error("QR scanner start failed:", err));
    });
    return () => {
      stopped = true;
      scannerRef.current
        ?.stop()
        .then(() => scannerRef.current?.clear())
        .catch(() => {});
    };
  }, []); // Start once on mount — pause via ref to avoid re-starting camera

  return (
    <div
      id="qr-reader-container"
      className="w-full max-w-sm mx-auto rounded-lg overflow-hidden"
    />
  );
}
