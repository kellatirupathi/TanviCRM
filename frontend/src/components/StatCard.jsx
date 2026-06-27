import { Card } from './ui/Card.jsx';

// Intentionally varied stat cards (not four identical boxes) — accent strip,
// optional trend delta, optional sparkline children.
export default function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'plum',
  delta,
  children,
}) {
  const accents = {
    plum: 'text-plum-600 bg-plum-50',
    gold: 'text-gold-600 bg-gold-50',
    green: 'text-emerald-600 bg-emerald-50',
    ink: 'text-ink bg-paper-100',
  };
  const deltaUp = delta != null && delta >= 0;

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{label}</p>
          <p className="mt-2 font-display text-[1.85rem] leading-none text-ink">{value}</p>
          {sub && <p className="mt-2 text-xs text-ink-muted">{sub}</p>}
        </div>
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accents[accent]}`}>
            {icon}
          </span>
        )}
      </div>
      {delta != null && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
              deltaUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5">
              {deltaUp ? <path d="M23 6l-9.5 9.5-5-5L1 18" /> : <path d="M23 18l-9.5-9.5-5 5L1 6" />}
            </svg>
            {Math.abs(delta)}%
          </span>
          <span className="text-xs text-ink-muted">vs last month</span>
        </div>
      )}
      {children}
    </Card>
  );
}
