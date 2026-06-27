export function Card({ className = '', children, ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-5 pt-5 ${className}`}>
      <h3 className="text-lg text-ink">{title}</h3>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-plum-50 text-plum-400">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path d="M9 17H7a4 4 0 0 1 0-8h.5M15 17h2a4 4 0 0 0 0-8h-.5M8 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3 className="text-lg text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
