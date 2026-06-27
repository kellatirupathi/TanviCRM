const VARIANTS = {
  primary:
    'bg-plum-700 text-white hover:bg-plum-800 active:bg-plum-900 shadow-sm focus-visible:ring-plum-300',
  gold: 'bg-gold-500 text-white hover:bg-gold-600 active:bg-gold-700 shadow-sm focus-visible:ring-gold-300',
  outline:
    'border border-plum-200 bg-white text-plum-800 hover:bg-plum-50 hover:border-plum-300 focus-visible:ring-plum-200',
  ghost: 'text-ink-soft hover:bg-paper-100 focus-visible:ring-plum-200',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm focus-visible:ring-rose-300',
  subtle: 'bg-paper-100 text-ink-soft hover:bg-paper-200 focus-visible:ring-plum-200',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-9 w-9 p-0',
};

export default function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <Tag
      className={`inline-flex items-center justify-center rounded-lg font-medium transition
        focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </Tag>
  );
}
