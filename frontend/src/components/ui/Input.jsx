import { forwardRef } from 'react';

export const Field = ({ label, error, hint, required, children, className = '' }) => (
  <label className={`block ${className}`}>
    {label && (
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-soft">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
    )}
    {children}
    {error ? (
      <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
    ) : hint ? (
      <span className="mt-1 block text-xs text-ink-muted">{hint}</span>
    ) : null}
  </label>
);

export const Input = forwardRef(({ className = '', invalid, ...props }, ref) => (
  <input
    ref={ref}
    className={`input-base ${invalid ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-200' : ''} ${className}`}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className = '', ...props }, ref) => (
  <textarea ref={ref} className={`input-base resize-none ${className}`} rows={3} {...props} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ className = '', children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={`input-base appearance-none pr-9 ${className}`}
      {...props}
    >
      {children}
    </select>
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = 'Select';
