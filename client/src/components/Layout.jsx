import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Avatar } from './ui.jsx';
import { Home, Building, Receipt, Wrench, Activity, LogOut, Menu, X, Wallet, Bell } from './Icons.jsx';
import NotificationBell from './NotificationBell.jsx';

const ownerLinks = [
  { to: '/owner', label: 'Overview', icon: Home },
  { to: '/owner/properties', label: 'Properties', icon: Building },
  { to: '/owner/bills', label: 'Bills & payments', icon: Receipt },
  { to: '/owner/complaints', label: 'Maintenance', icon: Wrench },
  { to: '/owner/notifications', label: 'Notifications', icon: Bell },
];
const tenantLinks = [
  { to: '/dashboard', label: 'Overview', icon: Home },
  { to: '/bills', label: 'Bills & payments', icon: Wallet },
  { to: '/complaints', label: 'My requests', icon: Wrench },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isOwner = user?.role === 'owner';
  const links = isOwner ? ownerLinks : tenantLinks;
  const [open, setOpen] = useState(false);

  // billing-service flags responses it had to serve without user-service.
  const [degradedOn, setDegradedOn] = useState(null);
  const degraded = degradedOn === location.pathname;
  useEffect(() => {
    const onDegraded = () => setDegradedOn(window.location.pathname);
    window.addEventListener('rentbook:degraded', onDegraded);
    return () => window.removeEventListener('rentbook:degraded', onDegraded);
  }, []);

  const signOut = () => {
    logout();
    navigate('/login');
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const Sidebar = (
    <aside className="w-64 h-full bg-navy text-white flex flex-col">
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-coral flex items-center justify-center font-extrabold text-lg">R</span>
          <span className="font-extrabold text-xl tracking-tight">RentBook</span>
        </div>
        <button className="lg:hidden text-white/70" onClick={() => setOpen(false)} aria-label="Close menu">
          <X />
        </button>
      </div>

      <div className="px-4 pb-2">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40 mb-2">
          {isOwner ? 'Owner workspace' : 'Tenant portal'}
        </p>
        <nav className="space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon width={18} height={18} />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/status"
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Activity width={18} height={18} />
            Service status
          </NavLink>
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-2xl bg-white/8 p-3 flex items-center gap-3">
          <Avatar name={user?.name} size="sm" tone="coral" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{user?.name}</p>
            <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
          </div>
          <button onClick={signOut} className="text-white/60 hover:text-white" title="Sign out" aria-label="Sign out">
            <LogOut width={18} height={18} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_1fr]">
      <div className="hidden lg:block sticky top-0 h-screen">{Sidebar}</div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-navy-deep/50" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="relative h-full w-64">{Sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 bg-canvas/80 backdrop-blur border-b border-line px-5 sm:px-8 py-4 flex items-center gap-4">
          <button className="lg:hidden text-ink" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="min-w-0">
            <p className="text-xs text-muted">{today}</p>
            <p className="font-bold truncate">Hi {user?.name?.split(' ')[0]}, welcome back</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell settingsPath={isOwner ? '/owner/notifications' : '/notifications'} />
            <div className="hidden sm:block">
              <Avatar name={user?.name} size="md" tone="navy" />
            </div>
          </div>
        </header>

        <main className="px-5 sm:px-8 py-6 max-w-6xl">
          {degraded && (
            <div role="status" className="mb-5 text-sm rounded-xl border border-amber/25 bg-amber-soft text-amber px-4 py-3">
              Names and property details couldn’t be loaded because user-service isn’t responding. Bills and payments shown are up to date.
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
