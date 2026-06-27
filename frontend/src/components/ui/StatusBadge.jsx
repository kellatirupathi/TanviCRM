// Segment + generic status badges with deliberate, domain-fitting tones.
const SEGMENT_STYLES = {
  VIP: 'bg-gold-100 text-gold-800 ring-gold-300',
  Regular: 'bg-plum-100 text-plum-800 ring-plum-200',
  New: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  Inactive: 'bg-paper-200 text-ink-muted ring-paper-200',
};

const ROLE_STYLES = {
  admin: 'bg-plum-700 text-white ring-plum-700',
  staff: 'bg-paper-200 text-ink-soft ring-paper-200',
};

export function SegmentBadge({ segment, className = '' }) {
  const dot = {
    VIP: 'bg-gold-500',
    Regular: 'bg-plum-500',
    New: 'bg-emerald-500',
    Inactive: 'bg-ink-muted',
  }[segment];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${SEGMENT_STYLES[segment] || SEGMENT_STYLES.Inactive} ${className}`}
    >
      {segment === 'VIP' && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor">
          <path d="m12 2 2.4 6.9H21l-5.5 4.1 2.1 6.9L12 16.8 6.4 19.9l2.1-6.9L3 8.9h6.6z" />
        </svg>
      )}
      {segment !== 'VIP' && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {segment}
    </span>
  );
}

export function RoleBadge({ role, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${ROLE_STYLES[role] || ROLE_STYLES.staff} ${className}`}
    >
      {role}
    </span>
  );
}

export function Pill({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-paper-100 text-ink-soft ring-paper-200',
    plum: 'bg-plum-50 text-plum-700 ring-plum-200',
    gold: 'bg-gold-50 text-gold-700 ring-gold-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
