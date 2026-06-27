import { NavLink } from 'react-router-dom';
import Brand from '../Brand.jsx';
import { Icon } from '../icons.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: Icon.dashboard, end: true },
  { to: '/customers', label: 'Customers', icon: Icon.customers },
  { to: '/purchases', label: 'Purchases', icon: Icon.purchases },
  { to: '/segments', label: 'Segments', icon: Icon.segments },
  { to: '/team', label: 'Team', icon: Icon.users, adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { isAdmin } = useAuth();
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-ink/40 backdrop-blur-sm transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-plum-900 transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Brand />
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-plum-200 transition hover:bg-plum-800 lg:hidden"
            aria-label="Close menu"
          >
            <Icon.close className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-plum-300">
            Workspace
          </p>
          {items.map((item) => {
            const I = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-plum-700/80 text-white shadow-sm ring-1 ring-plum-600'
                      : 'text-plum-100 hover:bg-plum-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <I className={`h-[18px] w-[18px] ${isActive ? 'text-gold-300' : 'text-plum-300 group-hover:text-plum-100'}`} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
