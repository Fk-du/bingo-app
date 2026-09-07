'use client';

import { useState } from 'react';
import { BingoClaimResponse } from '@/types';
import { ActionButton, Field, Surface } from '@/components/ui/Surface';
import { BingoCard } from './BingoCard';

interface ClaimReviewCardProps {
  claim: BingoClaimResponse;
  index: number;
  onReject: (claimId: number, reason?: string) => void;
  isProcessing?: boolean;
}

function parseCardSnapshot(json: string | null): number[][] {
  if (!json) return Array.from({ length: 5 }, () => Array(5).fill(0));
  try {
    return JSON.parse(json);
  } catch {
    return Array.from({ length: 5 }, () => Array(5).fill(0));
  }
}

function parseCalledSnapshot(json: string | null): Set<number> {
  if (!json) return new Set();
  try {
    return new Set<number>(JSON.parse(json));
  } catch {
    return new Set();
  }
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return 'N/A';
  return new Date(ts).toLocaleString();
}

export function ClaimReviewCard({
  claim,
  index,
  onReject,
  isProcessing,
}: ClaimReviewCardProps) {
  const [reason, setReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const cardNumbers = parseCardSnapshot(claim.cardSnapshot);
  const calledNumbers = parseCalledSnapshot(claim.calledNumbersSnapshot);

  const total = 24;
  let marks = 0;
  for (const row of cardNumbers) {
    for (const n of row) {
      if (n > 0 && calledNumbers.has(n)) marks++;
    }
  }

  return (
    <Surface className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-bp-muted">Claim</p>
          <h3 className="mt-1 text-lg font-semibold text-bp-text">#{index}</h3>
          <p className="mt-1 text-sm text-bp-muted">ID {claim.id}</p>
        </div>
        <div className="text-right text-sm text-bp-muted">
          <p>Player #{claim.playerId}</p>
          <p>{formatTimestamp(claim.claimedAt)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-bp-muted">Player card</p>
          <BingoCard numbers={cardNumbers} calledNumbers={calledNumbers} />
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-bp-border bg-bp-surface/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.24em] text-bp-muted">
                Called at claim ({calledNumbers.size}/75)
              </p>
              <span className="rounded-full border border-bp-border bg-bp-surface-elevated px-2.5 py-1 text-xs font-semibold text-bp-text">
                {marks}/{total} marked
              </span>
            </div>
            <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
              {[...calledNumbers].sort((a, b) => a - b).map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-200"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!showRejectInput ? (
          <ActionButton variant="danger" onClick={() => setShowRejectInput(true)} disabled={isProcessing}>
            Reject
          </ActionButton>
        ) : (
          <div className="flex flex-1 flex-wrap items-end gap-2">
            <Field label="Rejection reason" hint="Optional but recommended for audit trails">
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason"
                className="w-full min-w-[220px] rounded-xl border border-bp-border bg-bp-surface/70 px-3 py-2 text-sm text-bp-text outline-none placeholder:text-bp-muted focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </Field>
            <ActionButton
              variant="danger"
              onClick={() => {
                onReject(claim.id, reason || undefined);
                setShowRejectInput(false);
                setReason('');
              }}
              disabled={isProcessing}
            >
              Confirm reject
            </ActionButton>
            <ActionButton
              variant="ghost"
              onClick={() => {
                setShowRejectInput(false);
                setReason('');
              }}
            >
              Cancel
            </ActionButton>
          </div>
        )}
      </div>
    </Surface>
  );
}
