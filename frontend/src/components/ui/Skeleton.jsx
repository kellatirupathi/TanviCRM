export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-paper-200">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex flex-1 items-center gap-6">
            {Array.from({ length: cols - 1 }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-3.5 rounded"
                style={{ width: `${[40, 22, 18, 14][c % 4] || 20}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }) {
  return (
    <div className={`card p-5 ${className}`}>
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="mt-4 h-8 w-32 rounded" />
      <Skeleton className="mt-3 h-3 w-20 rounded" />
    </div>
  );
}
