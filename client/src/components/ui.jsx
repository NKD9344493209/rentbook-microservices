import { useEffect } from 'react';
import { X } from './Icons.jsx';
import { initials } from '../utils/format.js';

/* Building blocks reused on every page. */

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-surface rounded-2xl shadow-card border border-line/60 ${className}`}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h2 className="font-bold text-[15px]">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-deep',
    coral: 'bg-coral text-white hover:opacity-90',
    ghost: 'bg-surface text-ink border border-line hover:bg-soft',
    soft: 'bg-accent-soft text-accent-deep hover:bg-accent/15',
    danger: 'bg-red-soft text-red hover:bg-red/15',
    link: 'bg-transparent text-accent hover:underline px-0',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-sm' };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${sizes[size]} ${className}`}
    />
  );
}

const inputClass =
  'w-full px-3.5 py-2.5 bg-surface border border-line rounded-xl text-sm text-ink placeholder:text-muted/60 focus:border-accent outline-none disabled:bg-soft';

export function Field({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>
      <input {...props} className={inputClass} />
      {hint && <span className="block text-[11px] text-muted mt-1">{hint}</span>}
    </label>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>
      <select {...props} className={inputClass}>
        {children}
      </select>
    </label>
  );
}

export function TextArea({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-muted mb-1.5">{label}</span>
      <textarea {...props} className={inputClass} />
    </label>
  );
}

/* Status pill. Works for bill status, complaint status and priority. */
export function Pill({ status, dot = true }) {
  const map = {
    paid: ['bg-green-soft text-green', 'Paid'],
    resolved: ['bg-green-soft text-green', 'Resolved'],
    pending: ['bg-amber-soft text-amber', 'Pending'],
    'in-progress': ['bg-accent-soft text-accent-deep', 'In progress'],
    overdue: ['bg-red-soft text-red', 'Overdue'],
    high: ['bg-red-soft text-red', 'High'],
    medium: ['bg-amber-soft text-amber', 'Medium'],
    low: ['bg-soft text-muted', 'Low'],
  };
  const [cls, label] = map[status] || ['bg-soft text-muted', String(status)];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${cls}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function Avatar({ name, size = 'md', tone = 'accent' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' };
  const tones = {
    accent: 'bg-accent-soft text-accent-deep',
    coral: 'bg-coral-soft text-coral',
    green: 'bg-green-soft text-green',
    navy: 'bg-navy text-white',
  };
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold shrink-0 ${sizes[size]} ${tones[tone]}`}>
      {initials(name) || '?'}
    </span>
  );
}

/* Stat tile: icon on the left, number + label on the right. */
export function StatTile({ icon: Icon, label, value, hint, tone = 'accent' }) {
  const tones = {
    accent: 'bg-accent-soft text-accent-deep',
    coral: 'bg-coral-soft text-coral',
    green: 'bg-green-soft text-green',
    amber: 'bg-amber-soft text-amber',
  };
  return (
    <Card className="p-5 flex items-center gap-4">
      <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
        <Icon width={22} height={22} />
      </span>
      <div className="min-w-0">
        <p className="tnum text-2xl font-extrabold leading-tight truncate">{value}</p>
        <p className="text-xs text-muted font-medium">{label}</p>
        {hint && <p className="text-[11px] text-muted/80 mt-0.5">{hint}</p>}
      </div>
    </Card>
  );
}

export function Notice({ tone = 'alert', children, onRetry, className = '' }) {
  const tones = {
    alert: 'text-red bg-red-soft border-red/15',
    success: 'text-green bg-green-soft border-green/15',
    warn: 'text-amber bg-amber-soft border-amber/20',
  };
  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={`text-sm border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${tones[tone]} ${className}`}
    >
      <span>{children}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-bold underline underline-offset-2 shrink-0">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, hint, action }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="font-bold">{title}</p>
      <p className="text-sm text-muted mt-1">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loader({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 rounded-2xl bg-surface border border-line/60" />
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

/* Slide-over panel for forms. Keeps lists uncluttered. */
export function Drawer({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-navy-deep/40" />
      <div className="relative w-full max-w-md h-full bg-surface shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-line">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-soft text-muted" aria-label="Close">
            <X />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* Segmented filter pills. */
export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex bg-soft border border-line rounded-xl p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
            value === o.value ? 'bg-surface shadow-sm text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
