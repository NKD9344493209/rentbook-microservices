import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Button, Card, Empty, Loader, Notice, PageHeader, Pill, Segmented } from '../components/ui.jsx';
import { Check, Clock } from '../components/Icons.jsx';
import { rupees, formatDate, formatMonth, relative } from '../utils/format.js';

const FILTERS = [{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }];

export default function Bills() {
  const { data: bills, setData: setBills, error: loadError, loading, reload } = useApi(api.getBills);
  const [filter, setFilter] = useState('all');
  const [payingId, setPayingId] = useState(null);
  const [error, setError] = useState('');

  const pay = async (id) => {
    setPayingId(id);
    setError('');
    try {
      const updated = await api.payBill(id);
      setBills((prev) => prev.map((b) => (b._id === id ? { ...b, status: updated.status, paidOn: updated.paidOn } : b)));
    } catch (err) {
      setError(err.message);
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <Loader />;
  if (loadError) return <Notice onRetry={reload}>{loadError}</Notice>;

  const pending = bills.filter((b) => b.status === 'pending').reduce((s, b) => s + b.total, 0);
  const paid = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.total, 0);
  const visible = filter === 'all' ? bills : bills.filter((b) => b.status === filter);

  return (
    <>
      <PageHeader title="Bills & payments" subtitle={`${rupees(paid)} paid · ${rupees(pending)} outstanding`} />
      {error && <Notice className="mb-4">{error}</Notice>}

      <div className="mb-4">
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      {visible.length === 0 ? (
        <Card><Empty title="No bills here" hint="Bills from your owner will appear in this list." /></Card>
      ) : (
        <div className="space-y-3">
          {visible.map((b) => {
            const isPaid = b.status === 'paid';
            return (
              <Card key={b._id} className="p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isPaid ? 'bg-green-soft text-green' : 'bg-amber-soft text-amber'}`}>
                    {isPaid ? <Check /> : <Clock />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{formatMonth(b.month)}</p>
                      <Pill status={b.status} />
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {isPaid ? `Paid on ${formatDate(b.paidOn)}` : `Due ${relative(b.dueDate)} · ${formatDate(b.dueDate)}`}
                      {b.property?.name ? ` · ${b.property.name}` : ''}
                    </p>
                  </div>
                  <p className={`tnum text-2xl font-extrabold ${isPaid ? 'text-muted' : 'text-ink'}`}>{rupees(b.total)}</p>
                  {isPaid ? (
                    <Button variant="ghost" size="sm" onClick={() => window.print()}>Receipt</Button>
                  ) : (
                    <Button onClick={() => pay(b._id)} disabled={payingId === b._id}>{payingId === b._id ? 'Processing…' : 'Pay now'}</Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-line text-xs">
                  {[['Rent', b.rent], ['Electricity', b.electricity], ['Water', b.water], ['Internet', b.internet]].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-soft px-3 py-2 flex justify-between">
                      <span className="text-muted">{l}</span>
                      <span className="tnum font-semibold">{rupees(v)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
