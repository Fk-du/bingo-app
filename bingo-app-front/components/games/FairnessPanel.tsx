'use client';

import { useEffect, useState } from 'react';
import { GameStatus } from '@/types';
import { useFairnessProof } from '@/hooks/useGames';

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type Verdict =
  | { kind: 'verifying' }
  | { kind: 'verified'; hash: string }
  | { kind: 'failed'; reason: string }
  | { kind: 'unavailable' };

export function FairnessPanel({
  gameId,
  status,
  liveHash,
}: {
  gameId: number;
  status?: GameStatus;
  liveHash?: string | null;
}) {
  const over = status === GameStatus.ENDED;
  const { data: proof } = useFairnessProof(gameId, over);
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'verifying' });

  useEffect(() => {
    if (!over) return;
    let cancelled = false;
    (async () => {
      try {
        if (!proof) {
          setVerdict({ kind: 'verifying' });
          return;
        }
        if (!proof.fairnessHash || !proof.sequence) {
          setVerdict({ kind: 'unavailable' });
          return;
        }
        const recomputed = await sha256Hex(proof.sequence.join(','));
        if (cancelled) return;
        // The player recomputes the commitment themselves: the revealed call
        // order must hash to the value published before the first call.
        if (!proof.sequenceIntact || recomputed !== proof.fairnessHash) {
          setVerdict({ kind: 'failed', reason: 'Call order does not match the pre-game commitment.' });
          return;
        }
        setVerdict({ kind: 'verified', hash: recomputed });
      } catch {
        if (!cancelled) setVerdict({ kind: 'failed', reason: 'Verification could not run in this browser.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [over, proof]);

  if (!over) {
    if (!liveHash) return null;
    return (
      <p className="mt-2 text-center text-[10px] tracking-wide text-bp-muted">
        Fair-play commitment{' '}
        <span className="font-mono text-bp-primary" title={liveHash}>
          {liveHash.slice(0, 12)}…{liveHash.slice(-6)}
        </span>{' '}
        — full call order will be verifiable once the game ends
      </p>
    );
  }

  return (
    <div
      className={`mt-2 rounded-xl border px-4 py-3 text-center ${
        verdict.kind === 'verified'
          ? 'border-bp-success/40 bg-bp-success/10'
          : verdict.kind === 'failed'
            ? 'border-bp-danger/50 bg-bp-danger/10'
            : 'border-bp-border bg-bp-surface'
      }`}
    >
      {verdict.kind === 'verifying' && (
        <p className="text-xs text-bp-muted">Checking fair-play commitment…</p>
      )}
      {verdict.kind === 'verified' && (
        <>
          <p className="text-sm font-bold text-emerald-300">✓ Verified fair</p>
          <p className="mt-0.5 text-[11px] text-bp-muted">
            The final call order matches the SHA-256 commitment published before the first number was called.
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-bp-primary" title={verdict.hash}>
            {verdict.hash}
          </p>
        </>
      )}
      {verdict.kind === 'failed' && (
        <>
          <p className="text-sm font-bold text-red-300">✗ Fairness check failed</p>
          <p className="mt-0.5 text-[11px] text-bp-muted">{verdict.reason}</p>
        </>
      )}
      {verdict.kind === 'unavailable' && (
        <p className="text-xs text-bp-muted">No fair-play commitment was recorded for this game.</p>
      )}
    </div>
  );
}
