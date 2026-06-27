import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import PageHeader from '../components/ui/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { CardSkeleton, Skeleton } from '../components/ui/Skeleton.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import { SegmentBadge } from '../components/ui/StatusBadge.jsx';
import { Icon } from '../components/icons.jsx';
import { analyticsApi } from '../api/endpoints.js';
import { inr, inrCompact, num, formatDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const CAT_COLORS = ['#6B2C4F', '#B8860B', '#9C4A74', '#CFA63C', '#8E5572', '#DDBF66', '#B96E94', '#7A6C5D', '#856084', '#3E5641'];

export default function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [summary, topCustomers, topCategories, trend, nvr] = await Promise.all([
          analyticsApi.summary(),
          analyticsApi.topCustomers({ limit: 6 }),
          analyticsApi.topCategories(),
          analyticsApi.revenueTrend({ months: 12 }),
          analyticsApi.newVsReturning({ months: 6 }),
        ]);
        if (active) setData({ summary, topCustomers, topCategories, trend, nvr });
      } catch (err) {
        toast.error(err.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  const { summary, topCustomers, topCategories, trend, nvr } = data;
  const seg = summary.customers.segments;
  const segmentData = [
    { name: 'VIP', value: seg.VIP, color: '#B8860B' },
    { name: 'Regular', value: seg.Regular, color: '#9C4A74' },
    { name: 'New', value: seg.New, color: '#3E9D6B' },
    { name: 'Inactive', value: seg.Inactive, color: '#C9BFC4' },
  ].filter((s) => s.value > 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Analytics Overview"
        title="Dashboard"
        description="A live read on revenue, your best customers, and what's selling at Tanvi Boutique."
      />

      {/* Stat row — intentionally varied accents, not identical boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue · This Month"
          value={inr(summary.revenue.month)}
          sub={`${num(summary.revenue.monthOrders)} orders billed`}
          icon={<Icon.wallet className="h-5 w-5" />}
          accent="plum"
          delta={summary.revenue.momDeltaPct}
        />
        <StatCard
          label="Revenue · This Quarter"
          value={inr(summary.revenue.quarter)}
          sub={`Avg order ${inr(summary.revenue.avgOrderValue)}`}
          icon={<Icon.trend className="h-5 w-5" />}
          accent="gold"
        />
        <StatCard
          label="Repeat Customer Rate"
          value={`${summary.customers.repeatRatePct}%`}
          sub={`${num(summary.customers.repeat)} of ${num(summary.customers.paying)} paying customers`}
          icon={<Icon.repeat className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="VIP Customers"
          value={num(seg.VIP)}
          sub={summary.customers.vipThreshold ? `Spend ≥ ${inr(summary.customers.vipThreshold)}` : 'Top 10% by spend'}
          icon={<Icon.star className="h-5 w-5" />}
          accent="ink"
        />
      </div>

      {/* Main grid: trend chart spans, segmentation donut beside it */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Revenue trend"
            action={<span className="text-xs text-ink-muted">Last 12 months</span>}
          />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6B2C4F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6B2C4F" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DD" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A7F85' }} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={inrCompact}
                  tick={{ fontSize: 11, fill: '#8A7F85' }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<RevenueTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6B2C4F"
                  strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={{ r: 0 }}
                  activeDot={{ r: 5, fill: '#6B2C4F', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Customer mix" />
          <div className="px-4 pb-5 pt-2">
            {segmentData.length ? (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={segmentData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {segmentData.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, n) => [`${v} customers`, n]}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {segmentData.map((s) => (
                    <div key={s.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-ink-soft">{s.name}</span>
                      <span className="ml-auto font-semibold text-ink">{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-ink-muted">No customers yet</p>
            )}
          </div>
        </Card>
      </div>

      {/* Lower grid: top customers, top categories, new vs returning */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="Top customers"
            action={
              <Link to="/segments" className="text-xs font-medium text-plum-600 hover:text-plum-800">
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-paper-200 px-2 pb-2">
            {topCustomers.map((c, i) => (
              <li key={c._id}>
                <button
                  onClick={() => navigate(`/customers/${c._id}`)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-paper-100"
                >
                  <span className="w-4 text-center font-display text-sm text-ink-muted">{i + 1}</span>
                  <Avatar name={c.name} color={c.avatarColor} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-muted">{num(c.purchaseCount)} purchases</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">{inr(c.totalSpend)}</p>
                    <SegmentBadge segment={c.segment} className="mt-0.5 scale-90" />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Popular categories" action={<span className="text-xs text-ink-muted">by revenue</span>} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategories.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DD" horizontal={false} />
                <XAxis type="number" tickFormatter={inrCompact} tick={{ fontSize: 11, fill: '#8A7F85' }} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 11, fill: '#4A3F45' }}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  formatter={(v, _n, p) => [inr(v), `${num(p.payload.units)} units · ${num(p.payload.orders)} orders`]}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: '#F7F3EC' }}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={18}>
                  {topCategories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="mt-5">
        <Card>
          <CardHeader title="New vs returning revenue" action={<span className="text-xs text-ink-muted">Last 6 months</span>} />
          <div className="px-2 pb-4 pt-3">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={nvr} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFE9DD" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#8A7F85' }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={inrCompact} tick={{ fontSize: 11, fill: '#8A7F85' }} tickLine={false} axisLine={false} width={52} />
                <Tooltip formatter={(v, n) => [inr(v), n === 'newRevenue' ? 'New customers' : 'Returning']} contentStyle={tooltipStyle} cursor={{ fill: '#F7F3EC' }} />
                <Legend
                  formatter={(v) => (v === 'newRevenue' ? 'New customers' : 'Returning customers')}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Bar dataKey="newRevenue" stackId="a" fill="#3E9D6B" radius={[0, 0, 0, 0]} barSize={34} />
                <Bar dataKey="returningRevenue" stackId="a" fill="#6B2C4F" radius={[6, 6, 0, 0]} barSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #EFE9DD',
  boxShadow: '0 12px 40px -12px rgba(58,23,42,0.28)',
  fontSize: 12,
};

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-paper-200 bg-white px-3.5 py-2.5 shadow-lift">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-0.5 font-display text-lg text-ink">{inr(payload[0].value)}</p>
      <p className="text-xs text-ink-muted">{num(payload[0].payload.orders)} orders</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <Skeleton className="h-4 w-32 rounded" />
      <Skeleton className="mt-3 h-9 w-48 rounded" />
      <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card h-80 p-5 lg:col-span-2"><Skeleton className="h-full w-full rounded-lg" /></div>
        <div className="card h-80 p-5"><Skeleton className="h-full w-full rounded-lg" /></div>
      </div>
    </div>
  );
}
