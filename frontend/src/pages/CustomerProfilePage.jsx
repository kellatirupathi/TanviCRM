import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { Card, CardHeader, EmptyState } from '../components/ui/Card.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { SegmentBadge, Pill } from '../components/ui/StatusBadge.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import PurchaseFormModal from '../components/PurchaseFormModal.jsx';
import { Icon } from '../components/icons.jsx';
import { customerApi, purchaseApi } from '../api/endpoints.js';
import { useMeta } from '../hooks/useMeta.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateReceipt } from '../lib/receipt.js';
import { inr, num, formatDate, formatDateTime } from '../lib/format.js';

export default function CustomerProfilePage() {
  const { id } = useParams();
  const meta = useMeta();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [toDeleteCustomer, setToDeleteCustomer] = useState(false);
  const [toDeletePurchase, setToDeletePurchase] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await customerApi.get(id);
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Customer not found');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const deleteCustomer = async () => {
    setBusy(true);
    try {
      await customerApi.remove(id);
      toast.success('Customer removed');
      navigate('/customers');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deletePurchase = async () => {
    setBusy(true);
    try {
      await purchaseApi.remove(toDeletePurchase._id);
      toast.success('Purchase removed');
      setToDeletePurchase(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!data) return null;

  const { customer, purchases, stats } = data;

  return (
    <div className="animate-fade-up">
      <Link to="/customers" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition hover:text-plum-700">
        <Icon.chevronLeft className="h-4 w-4" /> Back to customers
      </Link>

      {/* Profile header card */}
      <Card className="mb-5 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-plum-700 via-plum-600 to-plum-800" />
        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={customer.name} color={customer.avatarColor} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-2xl text-ink sm:text-3xl">{customer.name}</h1>
                  <SegmentBadge segment={customer.segment} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Customer since {formatDate(customer.createdAt, { year: true })}
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 pb-1">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Icon.edit className="h-4 w-4" /> Edit
              </Button>
              <Button onClick={() => { setEditingPurchase(null); setPurchaseOpen(true); }}>
                <Icon.plus className="h-4 w-4" /> Log purchase
              </Button>
            </div>
          </div>

          {/* Contact + preferences */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-paper-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            <Detail icon={<Icon.phone className="h-4 w-4" />} label="Phone" value={customer.phone} />
            <Detail icon={<Icon.mail className="h-4 w-4" />} label="Email" value={customer.email || '—'} />
            <Detail icon={<Icon.pin className="h-4 w-4" />} label="Location" value={customer.address?.line || customer.address?.city || '—'} />
            <Detail
              icon={<Icon.sparkles className="h-4 w-4" />}
              label="Style preferences"
              value={
                customer.stylePreferences?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {customer.stylePreferences.map((p) => <Pill key={p} tone="plum">{p}</Pill>)}
                  </div>
                ) : '—'
              }
            />
          </div>
          {customer.notes && (
            <div className="mt-4 rounded-lg border border-gold-200 bg-gold-50/60 px-4 py-3 text-sm text-ink-soft">
              <span className="font-medium text-gold-800">Note · </span>{customer.notes}
            </div>
          )}
        </div>
      </Card>

      {/* Stats strip */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Total spend" value={inr(customer.totalSpend)} accent />
        <MiniStat label="Purchases" value={num(customer.purchaseCount)} />
        <MiniStat label="Avg order value" value={inr(stats.avgOrderValue)} />
        <MiniStat label="Last purchase" value={customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : '—'} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Purchase timeline */}
        <Card className="lg:col-span-2">
          <CardHeader title="Purchase history" action={<span className="text-xs text-ink-muted">{num(purchases.length)} records</span>} />
          {purchases.length === 0 ? (
            <EmptyState
              icon={<Icon.purchases className="h-8 w-8" />}
              title="No purchases yet"
              description="Log this customer's first purchase to start building their history."
              action={
                <Button onClick={() => { setEditingPurchase(null); setPurchaseOpen(true); }}>
                  <Icon.plus className="h-4 w-4" /> Log purchase
                </Button>
              }
            />
          ) : (
            <ol className="relative px-5 py-4">
              <span className="absolute left-[34px] top-6 bottom-6 w-px bg-paper-200" aria-hidden />
              {purchases.map((p) => (
                <li key={p._id} className="relative flex gap-4 pb-5 last:pb-0">
                  <span className="z-10 mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-plum-100 ring-4 ring-white">
                    <span className="h-2 w-2 rounded-full bg-plum-600" />
                  </span>
                  <div className="flex-1 rounded-xl border border-paper-200 bg-white p-4 transition hover:shadow-card">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{formatDateTime(p.date)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <Pill tone="gold">{p.paymentMethod}</Pill>
                          {p.invoiceNo && <span>· {p.invoiceNo}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg text-ink">{inr(p.amount)}</span>
                        <div className="flex items-center">
                          <button onClick={() => generateReceipt(p, customer)} className="rounded-lg p-1.5 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700" aria-label="Download receipt">
                            <Icon.receipt className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setEditingPurchase(p); setPurchaseOpen(true); }} className="rounded-lg p-1.5 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700" aria-label="Edit">
                            <Icon.edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => setToDeletePurchase(p)} className="rounded-lg p-1.5 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete">
                            <Icon.trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1.5 border-t border-paper-200 pt-3">
                      {(p.items || []).map((it, i) => (
                        <li key={i} className="flex items-center justify-between text-sm">
                          <span className="text-ink-soft">
                            {it.name}
                            <span className="ml-2 text-xs text-ink-muted">{it.category} · ×{it.quantity}</span>
                          </span>
                          <span className="text-ink">{inr(it.quantity * it.unitPrice)}</span>
                        </li>
                      ))}
                    </ul>
                    {p.notes && <p className="mt-2 text-xs italic text-ink-muted">“{p.notes}”</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Category affinity */}
        <Card>
          <CardHeader title="What they buy" />
          <div className="px-5 pb-5 pt-3">
            {stats.categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No data yet</p>
            ) : (
              <ul className="space-y-3.5">
                {stats.categoryBreakdown.map((c) => {
                  const pct = customer.totalSpend > 0
                    ? Math.round((c.value / customer.totalSpend) * 100)
                    : 0;
                  return (
                    <li key={c.category}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-ink-soft">{c.category}</span>
                        <span className="font-medium text-ink">{inr(c.value)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper-200">
                        <div className="h-full rounded-full bg-gradient-to-r from-plum-500 to-plum-700" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {isAdmin && (
              <button
                onClick={() => setToDeleteCustomer(true)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <Icon.trash className="h-4 w-4" /> Delete customer
              </button>
            )}
          </div>
        </Card>
      </div>

      <CustomerFormModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={load} customer={customer} stylePreferences={meta?.stylePreferences || []} />
      <PurchaseFormModal open={purchaseOpen} onClose={() => setPurchaseOpen(false)} onSaved={load} purchase={editingPurchase} meta={meta} lockedCustomer={customer} />

      <ConfirmDialog open={toDeleteCustomer} onClose={() => setToDeleteCustomer(false)} onConfirm={deleteCustomer} loading={busy}
        title="Delete customer?" confirmLabel="Delete customer"
        message={`This permanently removes ${customer.name} and all ${num(purchases.length)} purchase records.`} />
      <ConfirmDialog open={!!toDeletePurchase} onClose={() => setToDeletePurchase(null)} onConfirm={deletePurchase} loading={busy}
        title="Delete purchase?" confirmLabel="Delete purchase"
        message="This purchase will be removed and the customer's totals recalculated." />
    </div>
  );
}

const Detail = ({ icon, label, value }) => (
  <div>
    <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
      <span className="text-plum-400">{icon}</span> {label}
    </p>
    <div className="mt-1 text-sm text-ink">{value}</div>
  </div>
);

const MiniStat = ({ label, value, accent }) => (
  <Card className="p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
    <p className={`mt-1.5 font-display text-xl ${accent ? 'text-plum-700' : 'text-ink'}`}>{value}</p>
  </Card>
);

function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-32 rounded" />
      <Card className="mb-5 mt-5 overflow-hidden">
        <div className="h-20 bg-paper-200" />
        <div className="px-7 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <Skeleton className="h-20 w-20 rounded-full ring-4 ring-white" />
            <Skeleton className="mb-2 h-8 w-48 rounded" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card h-96 p-5 lg:col-span-2"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="card h-96 p-5"><Skeleton className="h-full w-full rounded-lg" /></div>
      </div>
    </div>
  );
}
