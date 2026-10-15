import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, CardHeader, Empty, Loader, Notice, Pill, StatTile } from '../components/ui.jsx';
import { MiniCalendar } from '../components/charts.jsx';
import { Home, Wallet, Clock, Wrench, Bolt, Drop, Wifi, Check } from '../components/Icons.jsx';
import { rupees, formatDate, formatMonth, daysBetween, relative } from '../utils/format.js';

export default function TenantDashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi([api.getTenantSummary, api.getBills, api.getComplaints]);

  if (loading) return <Loader rows={4} />;
  if (error) return <Notice onRetry={reload}>{error}</Notice>;

  const [summary, bills, complaints] = data;
  const bill = summary.currentBill;
  const daysLeft = bill ? daysBetween(new Date(), bill.dueDate) : null;
  const overdue = daysLeft !== null && daysLeft < 0;
  const urgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;

  const marks = {};
  bills.forEach((b) => {
    const d = b.status === 'paid' ? b.paidOn : b.dueDate;
    if (d) marks[new Date(d).toISOString().slice(0, 10)] = b.status === 'paid' ? 'paid' : 'due';
  });

  const recent = complaints.slice(0, 3);
  const history = bills.filter((b) => b.status === 'paid').slice(0, 3);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Hello, {user.name.split(' ')[0]}</h1>
          <p className="text-sm text-muted mt-1">
            {summary.property}
            {summary.room !== '—' ? ` · Room ${summary.room}` : ''}
          </p>
        </div>
        <Link to="/complaints">
          <Button variant="coral"><Wrench width={16} height={16} /> New request</Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <StatTile icon={Home} label="Monthly rent" value={rupees(bill ? bill.rent : history[0]?.rent || 0)} />
        <StatTile icon={Wallet} label="Outstanding" value={rupees(summary.totalOutstanding)} hint={`${summary.unpaidBills} unpaid bill(s)`} tone="coral" />
        <StatTile icon={Clock} label={overdue ? 'Days overdue' : 'Days remaining'} value={daysLeft === null ? '—' : Math.abs(daysLeft)} hint={bill ? `Due ${formatDate(bill.dueDate)}` : 'Nothing due'} tone={overdue ? 'coral' : 'amber'} />
        <StatTile icon={Wrench} label="Open requests" value={summary.openComplaints} tone="green" />
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          {bill ? (
            <Card className={`p-5 flex flex-wrap items-center gap-5 ${overdue || urgent ? 'border-coral/40' : ''}`}>
              <div className="flex-1 min-w-[200px]">
                {(overdue || urgent) && (
                  <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-coral-soft text-coral px-2 py-1 rounded-md mb-2">
                    {overdue ? 'Overdue' : 'Urgent'}
                  </span>
                )}
                <p className="text-sm text-muted">{formatMonth(bill.month)} bill</p>
                <p className="tnum text-4xl font-extrabold mt-1">{rupees(bill.total)}</p>
                <p className="text-sm text-muted mt-1">
                  {overdue ? `Was due ${relative(bill.dueDate)}` : `Due ${relative(bill.dueDate)}, ${formatDate(bill.dueDate)}`}
                </p>
              </div>
              <Link to="/bills">
                <Button size="lg">Pay now</Button>
              </Link>
            </Card>
          ) : (
            <Card className="p-5 flex items-center gap-4">
              <span className="w-12 h-12 rounded-xl bg-green-soft text-green flex items-center justify-center"><Check /></span>
              <div>
                <p className="font-bold">Nothing due right now</p>
                <p className="text-sm text-muted">Every bill on record is paid. New bills will show up here.</p>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="My requests" action={<Link to="/complaints" className="text-xs font-semibold text-accent">View all</Link>} />
              {recent.length === 0 ? (
                <Empty title="No requests yet" hint="Something broken? Report it from here." />
              ) : (
                <ul className="px-2 pb-3">
                  {recent.map((c) => (
                    <li key={c._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft">
                      <span className="w-8 h-8 rounded-lg bg-soft text-muted flex items-center justify-center shrink-0"><Wrench width={16} height={16} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{c.title}</p>
                        <p className="text-[11px] text-muted">{relative(c.createdAt)}</p>
                      </div>
                      <Pill status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Utilities" subtitle={bill ? `${formatMonth(bill.month)} breakdown` : 'Latest bill'} />
              {bill ? (
                <ul className="px-2 pb-3">
                  {[
                    [Home, 'Room rent', bill.rent],
                    [Bolt, 'Electricity', bill.electricity],
                    [Drop, 'Water', bill.water],
                    [Wifi, 'Internet', bill.internet],
                  ].map(([Icon, label, amt]) => (
                    <li key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft">
                      <span className="w-8 h-8 rounded-lg bg-accent-soft text-accent-deep flex items-center justify-center shrink-0"><Icon width={16} height={16} /></span>
                      <span className="text-sm font-medium flex-1">{label}</span>
                      <span className="tnum text-sm font-bold">{rupees(amt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty title="No bill yet" hint="Your utilities breakdown appears with your first bill." />
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Payment history" subtitle={`Paid so far ${rupees(summary.totalPaid)}`} action={<Link to="/bills" className="text-xs font-semibold text-accent">All bills</Link>} />
            {history.length === 0 ? (
              <Empty title="No payments yet" hint="Paid bills appear here as receipts." />
            ) : (
              <ul className="px-2 pb-3">
                {history.map((b) => (
                  <li key={b._id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-soft">
                    <span className="w-8 h-8 rounded-lg bg-green-soft text-green flex items-center justify-center shrink-0"><Check width={16} height={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{formatMonth(b.month)}</p>
                      <p className="text-[11px] text-muted">Paid on {formatDate(b.paidOn)}</p>
                    </div>
                    <span className="tnum text-sm font-bold">{rupees(b.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <MiniCalendar marks={marks} />
          </Card>
          <div className="rounded-2xl p-5 bg-navy text-white shadow-card relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-accent/40 blur-2xl" />
            <p className="font-bold relative">Need help?</p>
            <p className="text-xs text-white/60 mt-1 relative">Report a repair and your owner is notified instantly.</p>
            <Link to="/complaints" className="inline-block mt-4 relative">
              <Button variant="coral" size="sm">Report an issue</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
