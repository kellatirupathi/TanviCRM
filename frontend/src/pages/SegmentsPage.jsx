import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader.jsx';
import Button from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { TableSkeleton, CardSkeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { SegmentBadge } from '../components/ui/StatusBadge.jsx';
import { EmptyState } from '../components/ui/Card.jsx';
import { Icon } from '../components/icons.jsx';
import { customerApi, analyticsApi } from '../api/endpoints.js';
import { useToast } from '../context/ToastContext.jsx';
import { downloadCustomersCsv } from '../lib/download.js';
import { inr, num, relativeTime } from '../lib/format.js';

const SEGMENT_INFO = {
  VIP: { title: 'VIP', blurb: 'Top 10% by total spend', tone: 'gold', icon: Icon.star },
  Regular: { title: 'Regular', blurb: '2 or more purchases', tone: 'plum', icon: Icon.repeat },
  New: { title: 'New', blurb: 'First purchase made', tone: 'green', icon: Icon.sparkles },
  Inactive: { title: 'Inactive', blurb: 'Added, no purchases yet', tone: 'ink', icon: Icon.customers },
};

export default function SegmentsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [active, setActive] = useState('VIP');
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState({ items: [], pagination: {} });
  const [loadingList, setLoadingList] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    analyticsApi.summary().then(setSummary).catch(() => {});
  }, []);

  const loadSegment = useCallback(async (seg) => {
    setLoadingList(true);
    try {
      const res = await customerApi.list({ segment: seg, sort: 'spend', limit: 50 });
      setList(res);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => { loadSegment(active); }, [active, loadSegment]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCustomersCsv({ segment: active, sort: 'spend' });
      toast.success(`${active} segment exported to CSV`);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const segCounts = summary?.customers?.segments;
  const info = SEGMENT_INFO[active];

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Customer Segmentation"
        title="Segments"
        description="Customers are auto-tagged by spend and purchase behaviour. Filter, review and export each segment for re-engagement."
        actions={
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <Icon.download className="h-4 w-4" /> Export {active}
          </Button>
        }
      />

      {/* Segment selector cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {!segCounts
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : Object.entries(SEGMENT_INFO).map(([key, meta]) => {
              const I = meta.icon;
              const isActive = active === key;
              const tones = {
                gold: isActive ? 'border-gold-400 bg-gold-50' : 'hover:border-gold-300',
                plum: isActive ? 'border-plum-400 bg-plum-50' : 'hover:border-plum-300',
                green: isActive ? 'border-emerald-400 bg-emerald-50' : 'hover:border-emerald-300',
                ink: isActive ? 'border-ink-muted bg-paper-100' : 'hover:border-ink-muted',
              };
              const iconTones = { gold: 'text-gold-600 bg-gold-100', plum: 'text-plum-600 bg-plum-100', green: 'text-emerald-600 bg-emerald-100', ink: 'text-ink-soft bg-paper-200' };
              return (
                <button
                  key={key}
                  onClick={() => setActive(key)}
                  className={`card p-5 text-left transition ${tones[meta.tone]} ${isActive ? 'shadow-lift ring-1 ring-inset' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconTones[meta.tone]}`}>
                      <I className="h-5 w-5" />
                    </span>
                    <span className="font-display text-2xl text-ink">{num(segCounts[key] || 0)}</span>
                  </div>
                  <p className="mt-3 font-medium text-ink">{meta.title}</p>
                  <p className="text-xs text-ink-muted">{meta.blurb}</p>
                </button>
              );
            })}
      </div>

      {/* Active segment list */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-paper-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <SegmentBadge segment={active} />
            <span className="text-sm text-ink-muted">{info.blurb}</span>
          </div>
          <span className="text-xs text-ink-muted">{num(list.pagination?.total || 0)} customers</span>
        </div>

        {loadingList ? (
          <TableSkeleton rows={6} cols={4} />
        ) : list.items.length === 0 ? (
          <EmptyState
            icon={<info.icon className="h-8 w-8" />}
            title={`No ${active} customers`}
            description={active === 'VIP' ? 'VIP status unlocks once customers reach the top 10% by spend.' : 'This segment is currently empty.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-paper-200 text-left text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-3.5">#</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5 text-right">Total spend</th>
                  <th className="px-5 py-3.5 text-center">Purchases</th>
                  <th className="px-5 py-3.5">Last active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-200">
                {list.items.map((c, i) => (
                  <tr key={c._id} onClick={() => navigate(`/customers/${c._id}`)} className="cursor-pointer transition hover:bg-paper-100/70">
                    <td className="px-5 py-3.5 font-display text-sm text-ink-muted">{i + 1}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} color={c.avatarColor} size="sm" />
                        <div>
                          <p className="font-medium text-ink">{c.name}</p>
                          <p className="text-xs text-ink-muted">{c.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-ink">{inr(c.totalSpend)}</td>
                    <td className="px-5 py-3.5 text-center text-ink-soft">{num(c.purchaseCount)}</td>
                    <td className="px-5 py-3.5 text-sm text-ink-soft">{c.lastPurchaseAt ? relativeTime(c.lastPurchaseAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
