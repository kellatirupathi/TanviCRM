export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl text-ink sm:text-[2.1rem] sm:leading-tight">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted sm:text-[0.95rem]">{description}</p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
