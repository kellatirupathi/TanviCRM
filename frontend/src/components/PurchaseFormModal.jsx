import { useEffect, useMemo, useState } from 'react';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import { Field, Input, Select, Textarea } from './ui/Input.jsx';
import Avatar from './ui/Avatar.jsx';
import { Icon } from './icons.jsx';
import { customerApi, purchaseApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { inr } from '../lib/format.js';

const blankItem = () => ({ name: '', category: '', quantity: 1, unitPrice: '' });

// Local-day string (avoids the UTC shift that `toISOString` would introduce
// for a date-only value).
const dateInputValue = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return todayStr();
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10);
};
const todayStr = () => dateInputValue(new Date());

export default function PurchaseFormModal({
  open, onClose, onSaved, purchase, meta, lockedCustomer,
}) {
  const toast = useToast();
  const editing = Boolean(purchase);

  const [customer, setCustomer] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [items, setItems] = useState([blankItem()]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (purchase) {
      setCustomer(purchase.customer || lockedCustomer || null);
      setDate(dateInputValue(purchase.date));
      setPaymentMethod(purchase.paymentMethod || 'UPI');
      setItems(purchase.items?.length ? purchase.items.map((i) => ({ ...i })) : [blankItem()]);
      setNotes(purchase.notes || '');
    } else {
      setCustomer(lockedCustomer || null);
      setDate(todayStr());
      setPaymentMethod('UPI');
      setItems([blankItem()]);
      setNotes('');
      setSearch('');
      setResults([]);
    }
  }, [open, purchase, lockedCustomer]);

  // Debounced customer search.
  useEffect(() => {
    if (!open || lockedCustomer || customer || search.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    let ignore = false; // drop a late response if the user moved on / picked one
    const t = setTimeout(async () => {
      try {
        const { items: found } = await customerApi.list({ q: search.trim(), limit: 6 });
        if (!ignore) setResults(found);
      } catch {
        if (!ignore) setResults([]);
      } finally {
        if (!ignore) setSearching(false);
      }
    }, 280);
    return () => { ignore = true; clearTimeout(t); };
  }, [search, open, customer, lockedCustomer]);

  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );

  const setItem = (idx, key, val) =>
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, [key]: val } : it)));
  const addItem = () => setItems((arr) => [...arr, blankItem()]);
  const removeItem = (idx) => setItems((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr));

  const validate = () => {
    const e = {};
    if (!customer) e.customer = 'Select a customer';
    items.forEach((it, i) => {
      if (!it.name.trim()) e[`item${i}name`] = 'Required';
      if (!it.category) e[`item${i}cat`] = 'Pick a category';
      if (!(Number(it.quantity) >= 1)) e[`item${i}qty`] = 'Min 1';
      if (!(Number(it.unitPrice) >= 0) || it.unitPrice === '') e[`item${i}price`] = 'Required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        customer: customer._id,
        // Interpret the date-only input as LOCAL midnight, not UTC, so the
        // purchase isn't logged on the previous day in negative-offset zones.
        date: new Date(`${date}T00:00:00`).toISOString(),
        paymentMethod,
        notes,
        items: items.map((it) => ({
          name: it.name.trim(),
          category: it.category,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };
      const saved = editing
        ? await purchaseApi.update(purchase._id, payload)
        : await purchaseApi.create(payload);
      toast.success(editing ? 'Purchase updated' : 'Purchase logged');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not save purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={editing ? 'Edit purchase' : 'Log a purchase'}
      subtitle={customer ? customer.name : 'Record a sale against a customer'}
      footer={
        <>
          <div className="mr-auto text-sm text-ink-muted">
            Total <span className="ml-1 font-display text-lg text-ink">{inr(total)}</span>
          </div>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{editing ? 'Save changes' : 'Log purchase'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Customer picker */}
        {!lockedCustomer && (
          <Field label="Customer" required error={errors.customer}>
            {customer ? (
              <div className="flex items-center gap-3 rounded-lg border border-plum-200 bg-plum-50/60 px-3.5 py-2.5">
                <Avatar name={customer.name} color={customer.avatarColor} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{customer.name}</p>
                  <p className="text-xs text-ink-muted">{customer.phone}</p>
                </div>
                {!editing && (
                  <button type="button" onClick={() => setCustomer(null)} className="text-xs font-medium text-plum-600 hover:text-plum-800">
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="relative">
                <Icon.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="pl-10"
                  invalid={!!errors.customer}
                />
                {(searching || results.length > 0) && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-paper-200 bg-white shadow-lift">
                    {searching && <p className="px-3.5 py-3 text-sm text-ink-muted">Searching…</p>}
                    {!searching && results.map((c) => (
                      <button
                        type="button"
                        key={c._id}
                        onClick={() => { setCustomer(c); setSearch(''); setResults([]); }}
                        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-paper-100"
                      >
                        <Avatar name={c.name} color={c.avatarColor} size="xs" />
                        <span className="flex-1 truncate text-sm font-medium text-ink">{c.name}</span>
                        <span className="text-xs text-ink-muted">{c.phone}</span>
                      </button>
                    ))}
                    {!searching && results.length === 0 && search.trim().length >= 2 && (
                      <p className="px-3.5 py-3 text-sm text-ink-muted">No matches</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Field>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Purchase date" required>
            <Input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Payment method" required>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {(meta?.paymentMethods || []).map((m) => <option key={m}>{m}</option>)}
            </Select>
          </Field>
        </div>

        {/* Line items */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-soft">Items purchased</span>
            <Button type="button" variant="subtle" size="sm" onClick={addItem}>
              <Icon.plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <div key={idx} className="rounded-xl border border-paper-200 bg-paper-100/50 p-3">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <div className="sm:col-span-5">
                    <Input
                      value={it.name}
                      onChange={(e) => setItem(idx, 'name', e.target.value)}
                      placeholder="Item name"
                      invalid={!!errors[`item${idx}name`]}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <Select value={it.category} onChange={(e) => setItem(idx, 'category', e.target.value)} invalid={!!errors[`item${idx}cat`]}>
                      <option value="">Category…</option>
                      {(meta?.categories || []).map((c) => <option key={c}>{c}</option>)}
                    </Select>
                  </div>
                  <div className="sm:col-span-1">
                    <Input type="number" min="1" value={it.quantity} onChange={(e) => setItem(idx, 'quantity', e.target.value)} placeholder="Qty" />
                  </div>
                  <div className="sm:col-span-2">
                    <Input type="number" min="0" value={it.unitPrice} onChange={(e) => setItem(idx, 'unitPrice', e.target.value)} placeholder="Price ₹" invalid={!!errors[`item${idx}price`]} />
                  </div>
                  <div className="flex items-center justify-between sm:col-span-1 sm:justify-center">
                    <span className="text-sm font-medium text-ink sm:hidden">
                      {inr((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="rounded-lg p-2 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      aria-label="Remove item"
                    >
                      <Icon.trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 hidden justify-end text-xs text-ink-muted sm:flex">
                  Line total: {inr((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Occasion, alterations promised, etc." />
        </Field>
      </form>
    </Modal>
  );
}
