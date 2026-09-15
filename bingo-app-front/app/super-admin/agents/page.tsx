'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAgents, useInviteAgent, useUpdateAgentStatus, useWarnAgent, useAgentStats, useAgentWarnings } from '@/hooks/useAgents';
import { AgentResponse, AgentStatsResponse, AdminWarningResponse } from '@/types/agent';
import { ActionButton, EmptyState, SectionHeader, SelectField, Surface, StatusPill, TextField } from '@/components/ui/Surface';

const WARN_PRESETS = [
  'Suspicious account activity',
  'Slow / delayed payouts',
  'Complaints from players',
  'Policy violation',
] as const;

function WarnDialog({ agentLabel, onClose, onWarn }: {
  agentLabel: string;
  onClose: () => void;
  onWarn: (reason: string) => void;
}) {
  const [preset, setPreset] = useState('');
  const [custom, setCustom] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <Surface className="relative w-full max-w-sm p-5">
        <p className="text-lg font-bold text-bp-text">Warn agent</p>
        <p className="mt-1 text-sm text-bp-muted">{agentLabel}</p>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-bp-muted">Reason</p>
          <SelectField value={preset} onChange={(e) => setPreset(e.target.value)} className="w-full">
            <option value="" disabled>
              Select a reason
            </option>
            {WARN_PRESETS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="__custom__">Custom reason...</option>
          </SelectField>
        </div>

        {preset === '__custom__' && (
          <div className="mt-3">
            <TextField
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Enter custom reason"
              className="w-full"
            />
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <ActionButton variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={() => {
              const reason = preset === '__custom__' ? custom.trim() : preset.trim();
              onWarn(reason);
              onClose();
            }}
            disabled={preset === '' || (preset === '__custom__' && custom.trim() === '')}
            className="flex-1"
          >
            Warn
          </ActionButton>
        </div>
      </Surface>
    </div>
  );
}

function SuspConfirmDialog({ agentLabel, onClose, onConfirm }: {
  agentLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <Surface className="relative w-full max-w-sm p-5">
        <p className="text-lg font-bold text-bp-text">Suspend {agentLabel}?</p>
        <p className="mt-2 text-sm text-bp-muted">
          This will end all of the agent&apos;s active games and block their players from
          joining or playing until the agent is resumed. This action is not reversible
          for the current games.
        </p>
        <div className="mt-6 flex gap-2">
          <ActionButton variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={onConfirm}
            className="flex-1"
          >
            Suspend
          </ActionButton>
        </div>
      </Surface>
    </div>
  );
}

function StatsDialog({ agentLabel, stats, warnings, onClose }: {
  agentLabel: string;
  stats: AgentStatsResponse | undefined;
  warnings: AdminWarningResponse[] | undefined;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <Surface className="relative w-full max-w-sm p-5 max-h-[80vh] overflow-y-auto">
        <p className="text-lg font-bold text-bp-text">Agent statistics</p>
        <p className="mt-1 text-sm text-bp-muted">{agentLabel}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-bp-muted">Balance</p>
            <p className="mt-1 text-lg font-bold text-bp-gold">{stats?.balance.toLocaleString() ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Total Players</p>
            <p className="mt-1 text-lg font-bold text-bp-text">{stats?.totalPlayers ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Total Games</p>
            <p className="mt-1 text-lg font-bold text-bp-text">{stats?.totalGames ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Completed</p>
            <p className="mt-1 text-lg font-bold text-bp-text">{stats?.endedGames ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Transactions</p>
            <p className="mt-1 text-lg font-bold text-bp-text">{stats?.totalTransactions ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-bp-muted">Commission</p>
            <p className="mt-1 text-lg font-bold text-bp-success">{stats?.totalCommission.toLocaleString() ?? '—'}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-bp-muted">Warnings</p>
          {warnings && warnings.length ? (
            <ul className="space-y-1.5">
              {warnings.slice(0, 5).map((w) => (
                <li key={w.id} className="rounded-lg border border-bp-warning/40 bg-bp-warning/10 px-3 py-2">
                  <p className="text-xs text-bp-text">{w.reason}</p>
                  <p className="text-[11px] text-bp-muted">{new Date(w.createdAt).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-bp-muted">No warnings recorded.</p>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <ActionButton variant="secondary" onClick={onClose}>
            Close
          </ActionButton>
        </div>
      </Surface>
    </div>
  );
}

export default function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const { mutate: invite, isPending } = useInviteAgent();
  const { mutate: updateStatus } = useUpdateAgentStatus();
  const { mutate: warn } = useWarnAgent();
  const [warnTarget, setWarnTarget] = useState<AgentResponse | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AgentResponse | null>(null);
  const [statsTarget, setStatsTarget] = useState<number | null>(null);
  const { data: statsData } = useAgentStats(statsTarget);
  const { data: warningsData } = useAgentWarnings(statsTarget);

  const pendingApproval = agents?.filter((a) => !a.approved && a.active) ?? [];
  const approvedAgents = agents?.filter((a) => a.approved) ?? [];

  const agentLabel = (adminUserId: number) => {
    const agent = agents?.find((a) => a.adminUserId === adminUserId);
    return agent?.businessName ?? agent?.username ?? `Agent #${adminUserId}`;
  };

  return (
    <ProtectedRoute roles={[Role.SUPER_ADMIN]}>
      <SectionHeader
        eyebrow="Agents"
        title="Agent management"
        description="Approve new agents and manage their status."
        action={
          <ActionButton onClick={() => invite()} disabled={isPending} variant="primary">
            {isPending ? 'Generating...' : 'Invite agent'}
          </ActionButton>
        }
      />

      <div className="space-y-4">
          {pendingApproval.length > 0 && (
            <Surface className="p-4">
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Pending approval</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-100">{pendingApproval.length} agent{pendingApproval.length !== 1 ? 's' : ''} awaiting review</h2>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
                  <div className="h-16 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingApproval.map((agent: AgentResponse) => (
                    <div
                      key={agent.adminUserId}
                      className="rounded-[18px] border border-amber-500/30 bg-amber-500/5 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-100">
                            {agent.businessName ?? `@${agent.username ?? `Agent #${agent.adminUserId}`}`}
                          </p>
                          <p className="text-xs text-slate-500">ID {agent.adminUserId}</p>
                        </div>
                        <StatusPill status="PENDING" />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <ActionButton variant="success" onClick={() => updateStatus({ id: agent.adminUserId, status: 'APPROVE' })}>
                          Approve
                        </ActionButton>
                        <ActionButton variant="danger" onClick={() => updateStatus({ id: agent.adminUserId, status: 'REJECT' })}>
                          Reject
                        </ActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Surface>
          )}

          <Surface className="p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Registered agents</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-100">{agents?.length ?? 0} total</h2>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-16 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
                <div className="h-16 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
              </div>
            ) : approvedAgents.length ? (
              <div className="space-y-2">
                {approvedAgents.map((agent: AgentResponse) => (
                  <div
                    key={agent.adminUserId}
                    className="rounded-[18px] border border-slate-800 bg-slate-900/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-100">
                          {agent.businessName ?? `@${agent.username ?? `Agent #${agent.adminUserId}`}`}
                        </p>
                        <p className="text-xs text-slate-500">ID {agent.adminUserId}</p>
                      </div>
                      <StatusPill status={agent.active ? 'ACTIVE' : 'SUSPENDED'} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ActionButton
                        variant="outline"
                        onClick={() => setStatsTarget(agent.adminUserId)}
                      >
                        Stats
                      </ActionButton>
                      <ActionButton
                        variant="ghost"
                        onClick={() => setWarnTarget(agent)}
                      >
                        Warn
                      </ActionButton>
                      {agent.active ? (
                        <ActionButton
                          variant="danger"
                          onClick={() => setSuspendTarget(agent)}
                        >
                          Suspend
                        </ActionButton>
                      ) : (
                        <ActionButton
                          variant="success"
                          onClick={() => updateStatus({ id: agent.adminUserId, status: 'RESUME' })}
                        >
                          Resume
                        </ActionButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !pendingApproval.length ? (
              <EmptyState title="No agents found" description="Invites will populate this list." />
            ) : null}
          </Surface>
        </div>

      {warnTarget && (
        <WarnDialog
          agentLabel={agentLabel(warnTarget.adminUserId)}
          onClose={() => setWarnTarget(null)}
          onWarn={(reason) => warn({ id: warnTarget.adminUserId, reason })}
        />
      )}

      {suspendTarget && (
        <SuspConfirmDialog
          agentLabel={agentLabel(suspendTarget.adminUserId)}
          onClose={() => setSuspendTarget(null)}
          onConfirm={() => {
            updateStatus({ id: suspendTarget.adminUserId, status: 'SUSPEND' });
            setSuspendTarget(null);
          }}
        />
      )}

      {statsTarget != null && (
        <StatsDialog
          agentLabel={agentLabel(statsTarget)}
          stats={statsData}
          warnings={warningsData}
          onClose={() => setStatsTarget(null)}
        />
      )}
    </ProtectedRoute>
  );
}
