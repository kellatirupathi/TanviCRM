import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { RoleBadge, Pill } from '../components/ui/StatusBadge.jsx';
import Modal from '../components/ui/Modal.jsx';
import { Field, Input, Select } from '../components/ui/Input.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import { Icon } from '../components/icons.jsx';
import { userApi } from '../api/endpoints.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { formatDate, relativeTime } from '../lib/format.js';

const emptyForm = { name: '', email: '', password: '', role: 'staff' };

export default function TeamPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await userApi.list());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setErrors({}); setFormOpen(true); };
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setErrors({}); setFormOpen(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!editing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!editing && form.password.length < 6) e.password = 'Min 6 characters';
    if (editing && form.password && form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await userApi.update(editing.id, payload);
        toast.success('Team member updated');
      } else {
        await userApi.create(form);
        toast.success(`${form.name} added to the team`);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u) => {
    try {
      await userApi.update(u.id, { active: !u.active });
      toast.success(u.active ? 'Account deactivated' : 'Account reactivated');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await userApi.remove(toDelete.id);
      toast.success('Team member removed');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Access Control"
        title="Team"
        description="Manage who can access the CRM. Admins manage the team; staff handle customers and purchases."
        actions={<Button onClick={openNew}><Icon.plus className="h-4 w-4" /> Add member</Button>}
      />

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-paper-200 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Last login</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {users.map((u) => (
                  <tr key={u.id} className="group transition hover:bg-paper-100/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} color={u.avatarColor} size="sm" />
                        <div>
                          <p className="font-medium text-ink">
                            {u.name}{u.id === me?.id && <span className="ml-2 text-xs text-plum-600">(you)</span>}
                          </p>
                          <p className="text-xs text-ink-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3.5">
                      {u.active ? <Pill tone="green">Active</Pill> : <Pill tone="rose">Inactive</Pill>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-soft" title={u.lastLoginAt ? formatDate(u.lastLoginAt) : ''}>
                      {u.lastLoginAt ? relativeTime(u.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => openEdit(u)} className="rounded-lg p-2 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700" aria-label="Edit"><Icon.edit className="h-4 w-4" /></button>
                        {u.id !== me?.id && (
                          <>
                            <button onClick={() => toggleActive(u)} className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-paper-100 hover:text-ink-soft">
                              {u.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => setToDelete(u)} className="rounded-lg p-2 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Icon.trash className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit team member' : 'Add team member'}
        subtitle={editing ? editing.email : 'Grant access to the boutique CRM'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Add member'}</Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Priya Sharma" />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} disabled={!!editing} placeholder="name@tanviboutique.in" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Role" required>
              <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Select>
            </Field>
            <Field label={editing ? 'New password' : 'Password'} error={errors.password} hint={editing ? 'Leave blank to keep current' : 'Min 6 characters'}>
              <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} invalid={!!errors.password} placeholder="••••••••" />
            </Field>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Remove team member?" confirmLabel="Remove member"
        message={`${toDelete?.name} will lose access to the CRM immediately.`} />
    </div>
  );
}
