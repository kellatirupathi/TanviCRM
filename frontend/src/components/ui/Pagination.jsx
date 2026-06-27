import { Icon } from '../icons.jsx';
import { num } from '../../lib/format.js';

export default function Pagination({ page, pages, total, limit, onPage }) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-paper-200 px-5 py-3.5 sm:flex-row">
      <p className="text-xs text-ink-muted">
        Showing <span className="font-medium text-ink-soft">{num(from)}–{num(to)}</span> of{' '}
        <span className="font-medium text-ink-soft">{num(total)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-ink-soft transition hover:bg-paper-100 disabled:opacity-30"
        >
          <Icon.chevronLeft className="h-4 w-4" /> Prev
        </button>
        <span className="px-2 text-sm font-medium text-ink">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-ink-soft transition hover:bg-paper-100 disabled:opacity-30"
        >
          Next <Icon.chevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
