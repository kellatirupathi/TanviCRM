// Lightweight inline icon set (stroke-based, currentColor).
const base = { fill: 'none', viewBox: '0 0 24 24', strokeWidth: 1.7, stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };

export const Icon = {
  dashboard: (p) => (
    <svg {...base} {...p}><path d="M4 13h6V4H4zM14 9h6V4h-6zM14 20h6v-9h-6zM4 20h6v-5H4z" /></svg>
  ),
  customers: (p) => (
    <svg {...base} {...p}><path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" /><circle cx="9" cy="7" r="3.2" /><path d="M22 19v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></svg>
  ),
  purchases: (p) => (
    <svg {...base} {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>
  ),
  segments: (p) => (
    <svg {...base} {...p}><path d="M12 2v10l8.5 4.9" /><circle cx="12" cy="12" r="10" /></svg>
  ),
  users: (p) => (
    <svg {...base} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  search: (p) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
  ),
  plus: (p) => (<svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>),
  download: (p) => (<svg {...base} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>),
  edit: (p) => (<svg {...base} {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>),
  trash: (p) => (<svg {...base} {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></svg>),
  receipt: (p) => (<svg {...base} {...p}><path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5z" /><path d="M8 7h8M8 11h8M8 15h5" /></svg>),
  phone: (p) => (<svg {...base} {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.66A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>),
  mail: (p) => (<svg {...base} {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>),
  pin: (p) => (<svg {...base} {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>),
  trend: (p) => (<svg {...base} {...p}><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>),
  trendDown: (p) => (<svg {...base} {...p}><path d="M23 18l-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></svg>),
  wallet: (p) => (<svg {...base} {...p}><path d="M20 12V8a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h12v4" /><path d="M3 6v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1H17a2 2 0 0 0 0 4h4" /></svg>),
  repeat: (p) => (<svg {...base} {...p}><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>),
  star: (p) => (<svg {...base} {...p}><path d="m12 2 3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z" /></svg>),
  logout: (p) => (<svg {...base} {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>),
  menu: (p) => (<svg {...base} {...p}><path d="M3 12h18M3 6h18M3 18h18" /></svg>),
  close: (p) => (<svg {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>),
  calendar: (p) => (<svg {...base} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>),
  filter: (p) => (<svg {...base} {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54z" /></svg>),
  chevronLeft: (p) => (<svg {...base} {...p}><path d="m15 18-6-6 6-6" /></svg>),
  chevronRight: (p) => (<svg {...base} {...p}><path d="m9 18 6-6-6-6" /></svg>),
  sparkles: (p) => (<svg {...base} {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>),
  bag: (p) => (<svg {...base} {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" /></svg>),
  key: (p) => (<svg {...base} {...p}><path d="M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 0-1.4 1.4m1.4-1.4L18 5l3 3-3 3-2-2" /></svg>),
};
