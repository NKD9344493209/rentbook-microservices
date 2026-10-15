import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Bell } from './Icons.jsx';
import { relative } from '../utils/format.js';

/* Header bell: unread count + the latest alerts from notification-service.
   Polls every 30 s so a new complaint or payment shows up without a refresh. */
export default function NotificationBell({ settingsPath }) {
  const [data, setData] = useState({ items: [], unread: 0 });
  const [open, setOpen] = useState(false);
  const [down, setDown] = useState(false);
  const ref = useRef(null);

  const load = () =>
    api
      .getNotifications({ limit: 8 })
      .then((d) => {
        setData(d);
        setDown(false);
      })
      .catch(() => setDown(true));

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener('mousedown', onClick);
    return () => {
      clearInterval(t);
      window.removeEventListener('mousedown', onClick);
    };
  }, []);

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) load();
  };

  const markAll = async () => {
    await api.markAllRead().catch(() => {});
    setData((d) => ({ unread: 0, items: d.items.map((n) => ({ ...n, read: true })) }));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-muted hover:text-ink relative"
        aria-label={`Notifications, ${data.unread} unread`}
      >
        <Bell width={18} height={18} />
        {data.unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-coral text-white text-[10px] font-extrabold flex items-center justify-center">
            {data.unread > 99 ? '99+' : data.unread}
          </span>
        )}
        {down && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber" title="notification-service unreachable" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-2xl shadow-card z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="font-bold text-sm">Notifications</p>
            {data.unread > 0 && (
              <button onClick={markAll} className="text-xs font-semibold text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {down && <li className="px-4 py-6 text-sm text-muted text-center">notification-service is not reachable right now.</li>}
            {!down && data.items.length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">No notifications yet.</li>}
            {data.items.map((n) => (
              <li key={n._id} className={`px-4 py-3 border-b border-line last:border-0 ${n.read ? '' : 'bg-accent-soft/40'}`}>
                <Link to={n.link || settingsPath} onClick={() => setOpen(false)} className="block">
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug">{n.title}</p>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-muted/70 mt-1">
                        {relative(n.createdAt)}
                        {n.channel === 'telegram' && n.telegramStatus === 'sent' ? ' · sent to Telegram' : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link to={settingsPath} onClick={() => setOpen(false)} className="block text-center text-xs font-semibold text-accent px-4 py-3 border-t border-line hover:bg-soft">
            All notifications and Telegram settings
          </Link>
        </div>
      )}
    </div>
  );
}
