import { useState } from 'react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Field, Input } from '../components/ui/Input.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { RoleBadge } from '../components/ui/StatusBadge.jsx';
import { authApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate } from '../lib/format.js';

export default function AccountPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.currentPassword) errs.currentPassword = 'Required';
    if (form.newPassword.length < 6) errs.newPassword = 'Min 6 characters';
    if (form.newPassword !== form.confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password updated successfully');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Your Account" title="Account settings" description="Manage your profile and password." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card className="h-fit p-6">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user.name} color={user.avatarColor} size="xl" />
            <h3 className="mt-4 font-display text-xl text-ink">{user.name}</h3>
            <p className="text-sm text-ink-muted">{user.email}</p>
            <div className="mt-3"><RoleBadge role={user.role} /></div>
            <div className="mt-6 w-full space-y-2 border-t border-paper-200 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-ink-muted">Member since</span><span className="text-ink">{formatDate(user.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Last login</span><span className="text-ink">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</span></div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Change password" />
          <form onSubmit={submit} className="space-y-4 px-5 py-5">
            <Field label="Current password" required error={errors.currentPassword}>
              <Input type="password" value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} invalid={!!errors.currentPassword} autoComplete="current-password" />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="New password" required error={errors.newPassword}>
                <Input type="password" value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} invalid={!!errors.newPassword} autoComplete="new-password" />
              </Field>
              <Field label="Confirm new password" required error={errors.confirm}>
                <Input type="password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} invalid={!!errors.confirm} autoComplete="new-password" />
              </Field>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" loading={saving}>Update password</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
