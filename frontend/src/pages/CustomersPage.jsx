import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Card, EmptyState } from '../components/ui/Card.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { SegmentBadge, Pill } from '../components/ui/StatusBadge.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx';
import CustomerFormModal from '../components/CustomerFormModal.jsx';
import { Icon } from '../components/icons.jsx';
import { customerApi } from '../api/endpoints.js';
import { useMeta } from '../hooks/useMeta.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { downloadCustomersCsv } from '../lib/download.js';
import { inr, num, formatDate, relativeTime } from '../lib/format.js';

const SEGMENTS = ['VIP', 'Regular', 'New', 'Inactive'];

export default function CustomersPage() {
  const meta = useMeta();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [q, setQ] = useState('');
  const [segment, setSegment] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0, limit: 12 } });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const debounceRef = useRef();

  // Monotonic request id so out-of-order responses can't clobber fresh data.
  const reqIdRef = useRef(0);

  const fetchList = useCallback(async (params) => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    try {
      const res = await customerApi.list(params);
      if (reqId === reqIdRef.current) setData(res);
    } catch (err) {
      if (reqId === reqIdRef.current) toast.error(err.message || 'Failed to load customers');
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [toast]);

  // Single source of truth for fetching. Filter changes reset the page via the
  // setters below (not a second effect), so there's no double-fetch.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchList({ q, segment, sort, page, limit: 12 });
    }, q ? 300 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [q, segment, sort, page, fetchList]);

  // Changing a filter resets to page 1 atomically (avoids a stale-page fetch).
  const onSearch = (v) => { setQ(v); setPage(1); };
  const onSegment = (v) => { setSegment(v); setPage(1); };
  const onSort = (v) => { setSort(v); setPage(1); };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCustomersCsv({ q, segment, sort });
      toast.success('Customer list exported to CSV');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await customerApi.remove(toDelete._id);
      toast.success(`${toDelete.name} removed`);
      setToDelete(null);
      fetchList({ q, segment, sort, page, limit: 12 });
    } catch (err) {
      toast.error(err.message || 'Could not delete');
    } finally {
      setDeleting(false);
    }
  };

  const onSaved = () => fetchList({ q, segment, sort, page, limit: 12 });

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Customer Database"
        title="Customers"
        description="Search, segment and manage every customer who walks through the boutique."
        actions={
          <>
            <Button variant="outline" onClick={handleExport} loading={exporting}>
              <Icon.download className="h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Icon.plus className="h-4 w-4" /> New customer
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <Card className="mb-5 p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon.search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={q}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by name, phone or email…"
              className="pl-10"
            />
          </div>
          <div className="flex gap-3">
            <Select value={segment} onChange={(e) => onSegment(e.target.value)} className="min-w-[140px]">
              <option value="">All segments</option>
              {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select value={sort} onChange={(e) => onSort(e.target.value)} className="min-w-[150px]">
              <option value="recent">Recently active</option>
              <option value="spend">Highest spend</option>
              <option value="purchases">Most purchases</option>
              <option value="name">Name (A–Z)</option>
              <option value="created">Newest added</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={<Icon.customers className="h-8 w-8" />}
            title={q || segment ? 'No customers match your filters' : 'No customers yet'}
            description={q || segment ? 'Try adjusting your search or segment filter.' : 'Add your first customer to start tracking purchases.'}
            action={
              !q && !segment && (
                <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
                  <Icon.plus className="h-4 w-4" /> New customer
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-paper-200 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Segment</th>
                    <th className="px-5 py-3.5 text-right">Total spend</th>
                    <th className="px-5 py-3.5 text-center">Purchases</th>
                    <th className="px-5 py-3.5">Last purchase</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-paper-200">
                  {data.items.map((c) => (
                    <tr
                      key={c._id}
                      className="group cursor-pointer transition hover:bg-paper-100/70"
                      onClick={() => navigate(`/customers/${c._id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} color={c.avatarColor} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{c.name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                              <Icon.phone className="h-3 w-3" /> {c.phone}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><SegmentBadge segment={c.segment} /></td>
                      <td className="px-5 py-3.5 text-right font-medium text-ink">{inr(c.totalSpend)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Pill tone="neutral">{num(c.purchaseCount)}</Pill>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-ink-soft">
                        {c.lastPurchaseAt ? (
                          <span title={formatDate(c.lastPurchaseAt)}>{relativeTime(c.lastPurchaseAt)}</span>
                        ) : <span className="text-ink-muted">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditing(c); setFormOpen(true); }}
                            className="rounded-lg p-2 text-ink-muted transition hover:bg-plum-50 hover:text-plum-700"
                            aria-label="Edit"
                          >
                            <Icon.edit className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setToDelete(c); }}
                              className="rounded-lg p-2 text-ink-muted transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Delete"
                            >
                              <Icon.trash className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-paper-200 md:hidden">
              {data.items.map((c) => (
                <li
                  key={c._id}
                  onClick={() => navigate(`/customers/${c._id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-paper-100"
                >
                  <Avatar name={c.name} color={c.avatarColor} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-ink">{c.name}</p>
                      <SegmentBadge segment={c.segment} className="scale-90" />
                    </div>
                    <p className="text-xs text-ink-muted">{c.phone} · {num(c.purchaseCount)} purchases</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-ink">{inr(c.totalSpend)}</p>
                    <p className="text-xs text-ink-muted">{c.lastPurchaseAt ? relativeTime(c.lastPurchaseAt) : '—'}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Pagination
              page={data.pagination.page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              limit={data.pagination.limit}
              onPage={setPage}
            />
          </>
        )}
      </Card>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
        customer={editing}
        stylePreferences={meta?.stylePreferences || []}
      />

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete customer?"
        message={`This will permanently remove ${toDelete?.name} and all their purchase history. This cannot be undone.`}
        confirmLabel="Delete customer"
      />
    </div>
  );
}
