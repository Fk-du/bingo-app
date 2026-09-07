'use client';

import { useState, FormEvent } from 'react';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { Role } from '@/types/enums';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api';
import { ActionButton, Field, SectionHeader, Surface, TextField } from '@/components/ui/Surface';
import { UserProfileResponse } from '@/types';

export default function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <ProtectedRoute roles={[Role.ADMIN]}>
      <SectionHeader
        eyebrow="Settings"
        title="Deposit account"
        description="Set the account details players see when depositing."
      />
      <ProfileForm key={user?.id ?? 'anonymous'} user={user} />
    </ProtectedRoute>
  );
}

function ProfileForm({ user }: { user: UserProfileResponse | null }) {
  const setUser = useAuthStore((s) => s.setUser);

  const [depositInfo, setDepositInfo] = useState(user?.depositAccountInfo ?? '');
  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await authApi.updateProfile({
        depositAccountInfo: depositInfo,
        businessName,
      });
      if (res.data) setUser(res.data);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Surface className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Business name">
          <TextField
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Bingo Agent Addis"
          />
        </Field>

        <Field
          label="Deposit account info"
          hint="TeleBirr number, bank account, or any payment details players should send to"
        >
          <textarea
            value={depositInfo}
            onChange={(e) => setDepositInfo(e.target.value)}
            placeholder={"e.g. TeleBirr: 0911234567\nCBE: 1000123456789"}
            rows={3}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </Field>

        {saved && <p className="text-sm text-emerald-400">Saved successfully.</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <ActionButton type="submit" disabled={saving} variant="primary" className="w-full">
          {saving ? 'Saving...' : 'Save'}
        </ActionButton>
      </form>
    </Surface>
  );
}