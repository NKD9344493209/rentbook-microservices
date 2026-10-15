import { compact } from '../utils/format.js';

/* Hand-drawn SVG charts. No library: a few numbers don't need one,
   and every line can be explained in a viva. */

export function BarChart({ data, height = 170 }) {
  const peak = Math.max(1, ...data.map((d) => d.amount));
  return (
    <div className="flex items-end gap-3" style={{ height }} role="img" aria-label="Collections by month">
      {data.map((d, i) => {
        const last = i === data.length - 1;
        const pct = (d.amount / peak) * 100;
        return (
          <div key={d.key || i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5">
            <span className="tnum text-[11px] font-bold text-ink">{d.amount ? compact(d.amount) : ''}</span>
            <div className="w-full flex items-end" style={{ height: '70%' }}>
              <div
                className={`w-full rounded-t-lg transition-all duration-500 ${last ? 'bg-accent' : 'bg-accent-soft'}`}
                style={{ height: `${Math.max(pct, 2)}%` }}
                title={`${d.month}: ${d.amount}`}
              />
            </div>
            <span className="text-[11px] text-muted">{d.month}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Donut({ value, total, label, size = 150, color = 'var(--color-accent)', track = 'var(--color-accent-soft)' }) {
  const pct = total ? Math.min(1, value / total) : 0;
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="12" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-2xl font-extrabold leading-none">{Math.round(pct * 100)}%</span>
        <span className="text-[11px] text-muted mt-1">{label}</span>
      </div>
    </div>
  );
}

/* Horizontal bars with a value on the right, like an ageing report. */
export function HBars({ rows, color = 'var(--color-accent)' }) {
  const peak = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[52px_1fr_auto] items-center gap-3 text-sm">
          <span className="text-muted text-xs font-medium">{r.label}</span>
          <div className="h-2.5 rounded-full bg-soft overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(r.value / peak) * 100}%`, background: color }} />
          </div>
          <span className="tnum text-xs font-bold">{r.display}</span>
        </div>
      ))}
    </div>
  );
}

/* Month grid with marked dates. marks: { 'YYYY-MM-DD': 'due' | 'paid' } */
export function MiniCalendar({ marks = {} }) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const key = (d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <div>
      <p className="text-sm font-bold mb-3">{today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((d, i) => {
          const mark = d && marks[key(d)];
          const isToday = d === today.getDate();
          return (
            <span
              key={i}
              className={`relative h-8 flex items-center justify-center rounded-lg tnum ${
                isToday ? 'bg-navy text-white font-bold' : d ? 'text-ink' : ''
              } ${mark === 'due' && !isToday ? 'bg-coral-soft text-coral font-bold' : ''} ${
                mark === 'paid' && !isToday ? 'bg-green-soft text-green font-bold' : ''
              }`}
            >
              {d || ''}
            </span>
          );
        })}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-muted">
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-navy" /> Today</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-coral" /> Due</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-full bg-green" /> Paid</span>
      </div>
    </div>
  );
}
