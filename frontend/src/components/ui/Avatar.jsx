import { initials } from '../../lib/format.js';

const SIZES = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-20 w-20 text-2xl',
};

export default function Avatar({ name = '', color = '#6B2C4F', size = 'md', className = '' }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ring-2 ring-white ${SIZES[size]} ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}
