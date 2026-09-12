'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { configApi } from '@/api';
import { ActionButton, Field, SectionHeader, Surface, TextField } from '@/components/ui/Surface';

const FIELD_HINTS: Record<string, string> = {
  maxWinners: 'Maximum winners per game',
  cardSize: 'Numbers per card (e.g. 25)',
  numberRange: 'Number range (e.g. 75)',
  autoCallInterval: 'Auto-call interval in ms (e.g. 5000)',
  entryFee: 'Default entry fee per game',
  maxPlayers: 'Default max players per game',
  minWithdrawal: 'Minimum amount a player can request for withdrawal',
  ownerShareRate: '% of an admin\'s per-game commission that goes to you (0-100)',
};

const FIELD_LABELS: Record<string, string> = {
  maxWinners: 'Max Winners',
  cardSize: 'Card Size',
  numberRange: 'Number Range',
  autoCallInterval: 'Auto Call Interval (ms)',
  entryFee: 'Default Entry Fee',
  maxPlayers: 'Default Max Players',
  minWithdrawal: 'Minimum Withdrawal',
  ownerShareRate: 'Owner Share Rate (%)',
};

export default function ConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    configApi.get().then((res) => {
      if (res.data && typeof res.data === 'object') {
        const flat: Record<string, string> = {};
        for (const [k, v] of Object.entries(res.data)) {
          flat[k] = String(v ?? '');
        }
        setConfig(flat);
      }
      setLoading(false);
    }).catch(() => {
      setMessage('Failed to load config.');
      setLoadError('Failed to load config. Check your connection and try again.');
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await configApi.update({ config });
      setMessage('Config updated successfully.');
    } catch {
      setMessage('Failed to update config.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute roles={[Role.SUPER_ADMIN]}>
      <SectionHeader
        eyebrow="Configuration"
        title="Platform settings"
        description="Adjust global game parameters. Per-game commission is set in game management."
      />

      {loading ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
          <div className="h-12 animate-pulse rounded-[18px] border border-slate-800 bg-slate-900/60" />
        </div>
      ) : loadError ? (
        <Surface className="p-6 text-center text-sm text-bp-danger">{loadError}</Surface>
      ) : Object.keys(config).length === 0 ? (
        <Surface className="p-6 text-center text-sm text-bp-muted">
          No configuration values returned by the server.
        </Surface>
      ) : (
        <Surface className="max-w-lg p-5">
          <div className="space-y-5">
            {Object.entries(config).map(([key, value]) => (
              <Field key={key} label={FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').trim()} hint={FIELD_HINTS[key]}>
                <TextField
                  type="text"
                  value={value}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </Field>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <ActionButton onClick={handleSave} disabled={saving} variant="primary">
              {saving ? 'Saving...' : 'Save Config'}
            </ActionButton>
            {message && (
              <p className={`text-sm ${message.includes('Failed') ? 'text-bp-danger' : 'text-bp-success'}`}>
                {message}
              </p>
            )}
          </div>
        </Surface>
      )}
    </ProtectedRoute>
  );
}
