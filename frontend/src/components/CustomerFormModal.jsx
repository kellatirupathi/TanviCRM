import { useEffect, useState } from 'react';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import { Field, Input, Textarea } from './ui/Input.jsx';
import ChipSelect from './ui/ChipSelect.jsx';
import { customerApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';

const empty = {
  name: '',
  phone: '',
  email: '',
  address: { line: '', city: 'Hyderabad', pincode: '' },
  stylePreferences: [],
  notes: '',
};

export default function CustomerFormModal({ open, onClose, onSaved, customer, stylePreferences = [] }) {
  const toast = useToast();
  const editing = Boolean(customer);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        customer
          ? {
              name: customer.name || '',
              phone: customer.phone || '',
              email: customer.email || '',
              address: {
                line: customer.address?.line || '',
                city: customer.address?.city || 'Hyderabad',
                pincode: customer.address?.pincode || '',
              },
              stylePreferences: customer.stylePreferences || [],
              notes: customer.notes || '',
            }
          : empty
      );
      setErrors({});
    }
  }, [open, customer]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setAddr = (k, v) => setForm((f) => ({ ...f, address: { ...f.address, [k]: v } }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^(\+91[-\s]?)?[6-9]\d{9}$/.test(form.phone.trim()))
      e.phone = 'Enter a valid 10-digit Indian mobile number';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email or leave blank';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, phone: form.phone.trim(), name: form.name.trim() };
      const saved = editing
        ? await customerApi.update(customer._id, payload)
        : await customerApi.create(payload);
      toast.success(editing ? 'Customer updated' : `${saved.name} added`);
      onSaved?.(saved);
      onClose();
    } catch (err) {
      if (err.details) {
        const fieldErrs = {};
        err.details.forEach((d) => { fieldErrs[d.field] = d.message; });
        setErrors(fieldErrs);
      }
      toast.error(err.message || 'Could not save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit customer' : 'New customer'}
      subtitle={editing ? customer?.name : 'Add a customer to the boutique CRM'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>
            {editing ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} invalid={!!errors.name} placeholder="e.g. Aishwarya Reddy" />
          </Field>
          <Field label="Phone" required error={errors.phone}>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} invalid={!!errors.phone} placeholder="9848012345" />
          </Field>
        </div>

        <Field label="Email" error={errors.email} hint="Optional — for new-arrival updates">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} invalid={!!errors.email} placeholder="name@example.com" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
          <Field label="Address / area">
            <Input value={form.address.line} onChange={(e) => setAddr('line', e.target.value)} placeholder="Jubilee Hills, Hyderabad" />
          </Field>
          <Field label="Pincode">
            <Input value={form.address.pincode} onChange={(e) => setAddr('pincode', e.target.value)} placeholder="500033" />
          </Field>
        </div>

        <Field label="Style preferences" hint="Tap to tag what this customer tends to buy">
          <ChipSelect options={stylePreferences} value={form.stylePreferences} onChange={(v) => set('stylePreferences', v)} />
        </Field>

        <Field label="Notes">
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Preferences, sizing, special occasions…" />
        </Field>
      </form>
    </Modal>
  );
}
