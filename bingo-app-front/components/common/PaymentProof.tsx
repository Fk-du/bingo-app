'use client';

import { useEffect, useState } from 'react';
import { screenshotsApi } from '@/api';

interface PaymentProofProps {
  url: string | null | undefined;
  className?: string;
}

export function PaymentProof({ url, className = '' }: PaymentProofProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!url) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    screenshotsApi
      .fetchBlobUrl(url)
      .then((resolved) => {
        if (cancelled) {
          if (resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
          return;
        }
        objectUrl = resolved.startsWith('blob:') ? resolved : null;
        setBlobUrl(resolved);
        setFailed(false);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!url || failed) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className={`relative block h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border border-slate-700 bg-slate-800 ${className}`}
        aria-label="View payment proof"
      >
        {blobUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={blobUrl} alt="Payment proof" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
            Loading...
          </span>
        )}
      </button>

      {zoomed && blobUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setZoomed(false)}
            aria-label="Close"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={blobUrl}
            alt="Payment proof"
            className="relative max-h-[85vh] max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 rounded-full border border-slate-600 bg-slate-900/90 px-3 py-1 text-sm font-semibold text-slate-200"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
