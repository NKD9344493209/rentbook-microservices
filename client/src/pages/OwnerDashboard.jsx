import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Avatar, Button, Card, CardHeader, Empty, Loader, Notice, Pill, StatTile } from '../components/ui.jsx';
import { BarChart, Donut, HBars } from '../components/charts.jsx';
import { Building, Door, Wallet, Wrench, Plus } from '../components/Icons.jsx';
import { rupees, formatDate, formatMonth, relative, daysBetween } from '../utils/format.js';

/* One screen, two services: properties/occupancy come from user-service,
   money and repairs from billing-service (billing merges them for us). */
export default function OwnerDashboard() {
  const { data, error, loading, reload } = useApi([api.getOwnerStats, api.getBills, api.getComplaints]);

  if (loading) return <Loader rows={4} />;
  if (error) return <Notice onRetry={reload}>{error}</Notice>;

  const [stats, bills, complaints] = data;
  const today = new Date();

  const recentPayments = bills
    .filter((b) => b.status === 'paid')
    .sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn))
    .slice(0, 4);
  const openRequests = complaints.filter((c) => c.status !== 'resolved').slice(0, 4);

  // Unpaid rent ageing: how long each pending bill has been past its due date.
  const pending = bills.filter((b) => b.status === 'pending');
  const buckets = [
    { label: 'Not due', test: (d) => d <= 0 },
    { label: '1–30 d', test: (d) => d > 0 && d <= 30 },
    { label: '31–60 d', test: (d) => d > 30 && d <= 60 },
    { label: '60+ d', test: (d) => d > 60 },
  ].map((bk) => {
    const value = pending.filter((b) => bk.test(daysBetween(b.dueDate, today))).reduce((s, b) => s + b.total, 0);
    return { label: bk.label, value, display: rupees(value) };
  });

  const occupancyKnown = !stats.degraded && stats.rooms !== null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-sm text-muted mt-1">Your portfolio at a glance.</p>
        </div>
        <Link to="/owner/bills">
          <Button variant="coral">
            <Plus width={16} height={16} /> Issue bill
          </Button>
        </Link>
      </div>

      {stats.degraded && (
        <Notice tone="warn" onRetry={reload} className="mb-5">
          Occupancy is unavailable because user-service is not responding. Payment figures are current.
        </Notice>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile icon={Building} label="Properties" value={occupancyKnown ? stats.properties : '—'} hint={occupancyKnown ? `${stats.rooms} rooms in total` : ''} />
        <StatTile icon={Door} label="Vacant rooms" value={occupancyKnown ? stats.vacant : '—'} hint={occupancyKnown ? `${stats.occupied} occupied` : ''} tone="green" />
        <StatTile icon={Wallet} label="Unpaid rent" value={rupees(stats.pendingAmount)} hint={`${stats.pendingPayments} bill(s) pending`} tone="coral" />
        <StatTile icon={Wrench} label="Open requests" value={stats.openComplaints} hint="Awaiting action" tone="amber" />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-4 mb-4">
        <Card>
          <CardHeader
            title="Collections"
            subtitle="Rent received per billing month, last six months"
            action={
              <div className="text-right">
                <p className="tnum font-extrabold text-green">{rupees(stats.collectedThisMonth)}</p>
                <p className="text-[11px] text-muted">this month</p>
              </div>
            }
          />
          <div className="px-5 pb-5">
            <BarChart data={stats.collections} height={170} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Occupancy" subtitle="Across all properties" />
          <div className="px-5 pb-5 flex items-center gap-5">
            {occupancyKnown ? (
              <>
                <Donut value={stats.occupied} total={stats.rooms} label="filled" />
                <div className="text-sm space-y-3">
                  <div>
                    <p className="flex items-center gap-2 text-muted text-xs"><i className="w-2.5 h-2.5 rounded-sm bg-accent" /> Occupied</p>
                    <p className="tnum font-bold text-lg">{stats.occupied} rooms</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-2 text-muted text-xs"><i className="w-2.5 h-2.5 rounded-sm bg-accent-soft" /> Vacant</p>
                    <p className="tnum font-bold text-lg">{stats.vacant} rooms</p>
                  </div>
                  <p className="text-xs text-muted">Expected rent {rupees(stats.monthlyIncome)}/mo</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted py-6">{stats.degraded ? 'Unavailable right now.' : 'Add a property to see occupancy.'}</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Recent payments" action={<Link to="/owner/bills" className="text-xs font-semibold text-accent">View all</Link>} />
          {recentPayments.length === 0 ? (
            <Empty title="No payments yet" hint="Paid bills will show up here." />
          ) : (
            <ul className="px-2 pb-3">
              {recentPayments.map((b) => (
                <li key={b._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft">
                  <Avatar name={b.tenant?.name} size="sm" tone="green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{b.tenant?.name}</p>
                    <p className="text-[11px] text-muted truncate">
                      {relative(b.paidOn)} · {b.property?.name || formatMonth(b.month)}{b.room ? ` · ${b.room}` : ''}
                    </p>
                  </div>
                  <span className="tnum text-sm font-bold text-green">+{rupees(b.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Tenant requests" action={<Link to="/owner/complaints" className="text-xs font-semibold text-accent">View all</Link>} />
          {openRequests.length === 0 ? (
            <Empty title="Queue is clear" hint="No open maintenance requests." />
          ) : (
            <ul className="px-2 pb-3">
              {openRequests.map((c) => (
                <li key={c._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.priority === 'high' ? 'bg-red-soft text-red' : 'bg-soft text-muted'}`}>
                    <Wrench width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.title}</p>
                    <p className="text-[11px] text-muted truncate">
                      {relative(c.createdAt)} · {c.tenant?.name}{c.room && c.room !== '—' ? ` · room ${c.room}` : ''}
                    </p>
                  </div>
                  <Pill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Unpaid rent" subtitle={`Total ${rupees(stats.pendingAmount)}`} />
          <div className="px-5 pb-5">
            {pending.length === 0 ? (
              <p className="text-sm text-muted py-4">Everything is paid up.</p>
            ) : (
              <>
                <HBars rows={buckets} color="var(--color-coral)" />
                <p className="text-[11px] text-muted mt-4">
                  Oldest due {formatDate(pending.reduce((a, b) => (new Date(a.dueDate) < new Date(b.dueDate) ? a : b)).dueDate)}
                </p>
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
