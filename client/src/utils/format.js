/* Pure formatting helpers. Kept out of component files so those only
   export components (React Fast Refresh requirement). */

export const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export const compact = (n) => {
  const v = Number(n || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k`;
  return `₹${v}`;
};

// Bills store the billing period as YYYY-MM. Show it as "October 2026".
export const formatMonth = (key) => {
  const [y, m] = String(key || '').split('-').map(Number);
  if (!y || !m) return key || '—';
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const shortMonth = (key) => {
  const [y, m] = String(key || '').split('-').map(Number);
  if (!y || !m) return key || '—';
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
};

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Whole days between two dates, ignoring the time of day.
export const daysBetween = (from, to) => {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

// "2 days ago", "in 3 days", "today"
export const relative = (value) => {
  if (!value) return '';
  const d = daysBetween(new Date(), value);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
