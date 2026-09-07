'use client';

import { useEffect, useState } from 'react';

function calc(target: string | null | undefined): number | null {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  return ms <= 0 ? null : Math.ceil(ms / 1000);
}

/**
 * Seconds remaining until an ISO timestamp. Ticks twice a second.
 * Returns null when no target is given or it has already passed.
 */
export function useCountdown(target: string | null | undefined): number | null {
  const [remaining, setRemaining] = useState<number | null>(() => calc(target));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = calc(target);
      setRemaining((prev) => (prev === next ? prev : next));
    }, 500);
    return () => clearInterval(interval);
  }, [target]);

  return remaining;
}
