import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Card, EmptyState } from '../components/ui/Card.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { Pill } from '../components/ui/StatusBadge.jsx';
import { Input, Select, Field } from '../components/ui/Input.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import PurchaseFormModal from '../components/PurchaseFormModal.jsx';
import { Icon } from '../components/icons.jsx';
import { purchaseApi } from '../api/endpoints.js';
import { useMeta } from '../hooks/useMeta.js';
import { useToast } from '../context/ToastContext.jsx';
import { generateReceipt } from '../lib/receipt.js';
import { inr, num, formatDate } from '../lib/format.js';

export default function PurchasesPage() {
  const meta = useMeta();
  const toast = useToast();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({ category: '', paymentMethod: '', from: '', to: '', minAmount: '', maxAmount: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 15 } });
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Monotonic request id so out-of-order responses can't clobber fresh data.
  const reqIdRef = useRef(0);

  const fetchList = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const res = await purchaseApi.list({ ...params, page, limit: 15 });
      if (reqId === reqIdRef.current) setData(res);
    } catch (err) {
      if (reqId === reqIdRef.current) toast.error(err.message || 'Failed to load purchases');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Changing a filter resets to page 1 atomically (avoids a stale-page fetch).
  const setF = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(1); };
  const clearFilters = () => { setFilters({ category: '', paymentMethod: '', from: '', to: '', minAmount: '', maxAmount: '' }); setPage(1); };
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await purchaseApi.remove(toDelete._id);
      toast.success('Purchase removed');
      setToDelete(null);
      fetchList();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Purchase Tracking"
        title="Purchases"
        description="Every sale logged at the boutique counter, searchable by category, date and amount."
        actions={
          <>
            <Button variant="outline" onClick={() => setShowFilters((s) => !s)}>
              <Icon.filter className="h-4 w-4" /> Filters
              {activeFilterCount > 0 && <span className="ml-1 rounded-full bg-plum-600 px-1.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Icon.plus className="h-4 w-4" /> Log purchase
            </Button>
          </>
        }
      />

      {showFilters && (
        <Card className="mb-5 p-4 animate-fade-up">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Category">
              <Select value={filters.category} onChange={(e) => setF('category', e.target.value)}>
                <option value="">All categories</option>
                {(meta?.categories || []).map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Payment method">
              <Select value={filters.paymentMethod} onChange={(e) => setF('paymentMethod', e.target.value)}>
                <option value="">All methods</option>
                {(meta?.paymentMethods || []).map((m) => <option key={m}>{m}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Min ₹"><Input type="number" value={filters.minAmount} onChange={(e) => setF('minAmount', e.target.value)} placeholder="0" /></Field>
              <Field label="Max ₹"><Input type="number" value={filters.maxAmount} onChange={(e) => setF('maxAmount', e.target.value)} placeholder="∞" /></Field>
            </div>
            <Field label="From date"><Input type="date" value={filters.from} onChange={(e) => setF('from', e.target.value)} /></Field>
            <Field label="To date"><Input type="date" value={filters.to} onChange={(e) => setF('to', e.target.value)} /></Field>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all filters</Button>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<Icon.purchases className="h-8 w-8" />}
            title={activeFilterCount ? 'No purchases match these filters' : 'No purchases logged yet'}
            description={activeFilterCount ? 'Try widening your date range or amount filters.' : 'Log your first sale to start tracking revenue.'}
            action={!activeFilterCount && <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Icon.plus className="h-4 w-4" /> Log purchase</Button>}
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-paper-200 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Items</th>
                    <th className="px-5 py-3.5">Payment</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Amount</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {data.items.map((p) => (
                    <tr key={p._id} className="group transition hover:bg-paper-100/70">
                      <td className="px-5 py-3.5">
                        <button onClick={() => p.customer && navigate(`/customers/${p.customer._id}`)} className="flex items-center gap-3 text-left">
                          <Avatar name={p.customer?.name} color={p.customer?.avatarColor} size="sm" />
                          <div>
                            <p className="font-medium text-ink hover:text-plum-700">{p.customer?.name || 'Unknown'}</p>
                            <p className="text-xs text-ink-muted">{p.customer?.phone}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {p.items.slice(0, 2).map((it, i) => <Pill key={i} tone="neutral">{it.category}</Pill>)}
                          {p.items.length > 2 && <Pill tone="plum">+{p.items.length - 2}</Pill>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><Pill tone="gold">{p.paymentMethod}</Pill></td>
                      <td className="px-5 py-3.5 text-sm text-ink-soft">{formatDate(p.date)}</td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink">{inr(p.amount)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <button onClick={() => generateReceipt(p, p.customer)} className="rounded-lg p-2 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700" aria-label="Receipt"><Icon.receipt className="h-4 w-4" /></button>
                          <button onClick={() => { setEditing(p); setFormOpen(true); }} className="rounded-lg p-2 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700" aria-label="Edit"><Icon.edit className="h-4 w-4" /></button>
                          <button onClick={() => setToDelete(p)} className="rounded-lg p-2 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600" aria-label="Delete"><Icon.trash className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <ul className="divide-y divide-paper-200 md:hidden">
              {data.items.map((p) => (
                <li key={p._id} className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.customer?.name} color={p.customer?.avatarColor} size="md" />
                    <div className="min-w-0 flex-1" onClick={() => p.customer && navigate(`/customers/${p.customer._id}`)}>
                      <p className="truncate font-medium text-ink">{p.customer?.name || 'Unknown'}</p>
                      <p className="text-xs text-ink-muted">{formatDate(p.date)} · {p.paymentMethod}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-ink">{inr(p.amount)}</p>
                      <button onClick={() => generateReceipt(p, p.customer)} className="text-xs text-plum-600">Receipt</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} limit={data.pagination.limit} onPage={setPage} />
          </>
        )}
      </Card>

      <PurchaseFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchList} purchase={editing} meta={meta} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Delete purchase?" confirmLabel="Delete purchase"
        message={`Remove this ${inr(toDelete?.amount || 0)} purchase by ${toDelete?.customer?.name}? The customer's totals will be recalculated.`} />
    </div>
  );
}
