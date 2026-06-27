import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../icons.jsx';
import Avatar from '../ui/Avatar.jsx';
import { RoleBadge } from '../ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-paper-200 bg-paper/85 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-lg p-2 text-ink-soft transition hover:bg-paper-100 lg:hidden"
        aria-label="Open menu"
      >
        <Icon.menu className="h-5 w-5" />
      </button>

      <div className="hidden flex-1 lg:block">
        <p className="text-sm text-ink-muted">
          {greeting()}, <span className="font-medium text-ink">{user?.name?.split(' ')[0]}</span> — here's what's happening at the boutique.
        </p>
      </div>

      <div className="relative ml-auto" ref={ref}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 transition hover:bg-paper-100"
        >
          <Avatar name={user?.name} color={user?.avatarColor} size="sm" />
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-ink">{user?.name}</p>
            <p className="text-xs leading-tight text-ink-muted">{user?.email}</p>
          </div>
          <Icon.chevronRight className="hidden h-4 w-4 rotate-90 text-ink-muted sm:block" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-paper-200 bg-white shadow-lift animate-scale-in">
            <div className="flex items-center gap-3 border-b border-paper-200 px-4 py-3">
              <Avatar name={user?.name} color={user?.avatarColor} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{user?.name}</p>
                <div className="mt-1"><RoleBadge role={user?.role} /></div>
              </div>
            </div>
            <button
              onClick={() => { setMenuOpen(false); navigate('/account'); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-soft transition hover:bg-paper-100"
            >
              <Icon.key className="h-4 w-4 text-ink-muted" /> Account & password
            </button>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2.5 border-t border-paper-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <Icon.logout className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
