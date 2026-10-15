import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { Avatar, Button, Card, Drawer, Empty, Field, Loader, Notice, PageHeader, Pill, Segmented, Select } from '../components/ui.jsx';
import { Plus, Edit, Trash } from '../components/Icons.jsx';
import { rupees, formatDate, formatMonth, currentMonthKey } from '../utils/format.js';

/* Issue, edit and delete bills. Tenants/properties come from user-service,
   bills from billing-service; billing-service verifies the tenant and
   property with user-service before saving. */
const blank = () => ({ tenant: '', property: '', room: '', month: currentMonthKey(), dueDate: '', rent: '', electricity: '', water: '', internet: '' });
const FILTERS = [{ value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }];

export default function OwnerBills() {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchAll = () =>
    Promise.all([api.getTenants(), api.getProperties(), api.getBills()])
      .then(([t, p, b]) => {
        setTenants(t);
        setProperties(p);
        setBills(b);
        setLoadError('');
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));

  useEffect(() => {
    fetchAll();
  }, []);

  const reload = () => {
    setLoading(true);
    fetchAll();
  };

  const set = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'property' && !editingId) {
        const p = properties.find((x) => x._id === value);
        if (p && !prev.rent) next.rent = String(p.monthlyRent);
      }
      return next;
    });
  };

  const total = (Number(form.rent) || 0) + (Number(form.electricity) || 0) + (Number(form.water) || 0) + (Number(form.internet) || 0);

  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(blank());
  };
  const startAdd = () => {
    setError('');
    setSuccess('');
    setEditingId(null);
    setForm(blank());
    setOpen(true);
  };
  const startEdit = (b) => {
    setError('');
    setSuccess('');
    setEditingId(b._id);
    setForm({
      tenant: b.tenant?._id || '',
      property: b.property?._id || '',
      room: b.room || '',
      month: b.month,
      dueDate: b.dueDate ? b.dueDate.slice(0, 10) : '',
      rent: String(b.rent),
      electricity: String(b.electricity || ''),
      water: String(b.water || ''),
      internet: String(b.internet || ''),
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const amounts = {
      rent: Number(form.rent),
      electricity: Number(form.electricity) || 0,
      water: Number(form.water) || 0,
      internet: Number(form.internet) || 0,
      dueDate: form.dueDate,
      room: form.room.trim(),
    };
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateBill(editingId, amounts);
        setBills((prev) => prev.map((b) => (b._id === editingId ? updated : b)));
        setSuccess(`Bill for ${formatMonth(updated.month)} updated: ${rupees(updated.total)}.`);
      } else {
        const created = await api.createBill({ ...amounts, tenant: form.tenant, property: form.property || undefined, month: form.month });
        setBills((prev) => [created, ...prev]);
        setSuccess(`Bill issued to ${created.tenant.name} for ${formatMonth(created.month)}: ${rupees(created.total)}.`);
      }
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete the ${formatMonth(b.month)} bill for ${b.tenant?.name}?`)) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteBill(b._id);
      setBills((prev) => prev.filter((x) => x._id !== b._id));
      setSuccess('Bill deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = useMemo(() => (filter === 'all' ? bills : bills.filter((b) => b.status === filter)), [bills, filter]);
  const pendingTotal = bills.filter((b) => b.status === 'pending').reduce((s, b) => s + b.total, 0);
  const paidTotal = bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.total, 0);

  if (loading) return <Loader />;
  if (loadError) return <Notice onRetry={reload}>{loadError}</Notice>;

  return (
    <>
      <PageHeader title="Bills & payments" subtitle={`${rupees(paidTotal)} collected · ${rupees(pendingTotal)} pending`}>
        <Button variant="coral" onClick={startAdd} disabled={tenants.length === 0}><Plus width={16} height={16} /> Issue bill</Button>
      </PageHeader>

      {error && <Notice className="mb-4">{error}</Notice>}
      {success && <Notice tone="success" className="mb-4">{success}</Notice>}
      {tenants.length === 0 && <Notice tone="warn" className="mb-4">No tenant accounts yet. Ask tenants to register; they appear here immediately.</Notice>}

      <div className="mb-4">
        <Segmented options={FILTERS} value={filter} onChange={setFilter} />
      </div>

      <Card>
        {visible.length === 0 ? (
          <Empty title="No bills here" hint="Bills you issue appear in this list." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-line">
                  <th className="px-5 py-3 font-semibold">Tenant</th>
                  <th className="px-4 py-3 font-semibold">Month</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Property</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Due / paid</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((b) => (
                  <tr key={b._id} className="border-b border-line last:border-0 hover:bg-soft">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={b.tenant?.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{b.tenant?.name}</p>
                          <p className="text-[11px] text-muted truncate">{b.room ? `Room ${b.room}` : b.tenant?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatMonth(b.month)}</td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{b.property?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap hidden sm:table-cell">{b.status === 'paid' ? formatDate(b.paidOn) : formatDate(b.dueDate)}</td>
                    <td className="px-4 py-3"><Pill status={b.status} /></td>
                    <td className="px-4 py-3 text-right tnum font-bold whitespace-nowrap">{rupees(b.total)}</td>
                    <td className="px-4 py-3">
                      {b.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => startEdit(b)} className="p-1.5 rounded-lg text-muted hover:bg-accent-soft hover:text-accent-deep" title="Edit"><Edit width={16} height={16} /></button>
                          <button onClick={() => remove(b)} className="p-1.5 rounded-lg text-muted hover:bg-red-soft hover:text-red" title="Delete"><Trash width={16} height={16} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Drawer open={open} onClose={close} title={editingId ? 'Edit pending bill' : 'Issue a bill'}>
        <form onSubmit={submit} className="space-y-4">
          <Select label="Tenant" name="tenant" value={form.tenant} onChange={set} disabled={!!editingId} required>
            <option value="">Select a tenant…</option>
            {tenants.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
          </Select>
          <Select label="Property" name="property" value={form.property} onChange={set} disabled={!!editingId}>
            <option value="">No property</option>
            {properties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Room" name="room" value={form.room} onChange={set} placeholder="204" />
            <Field label="Billing month" name="month" type="month" value={form.month} onChange={set} disabled={!!editingId} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rent (₹)" name="rent" type="number" min="0" value={form.rent} onChange={set} required />
            <Field label="Electricity (₹)" name="electricity" type="number" min="0" value={form.electricity} onChange={set} />
            <Field label="Water (₹)" name="water" type="number" min="0" value={form.water} onChange={set} />
            <Field label="Internet (₹)" name="internet" type="number" min="0" value={form.internet} onChange={set} />
          </div>
          <Field label="Due date" name="dueDate" type="date" value={form.dueDate} onChange={set} required />
          <div className="rounded-xl bg-soft border border-line p-4 flex items-center justify-between">
            <span className="text-sm text-muted">Total</span>
            <span className="tnum text-xl font-extrabold">{rupees(total)}</span>
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Issue bill'}</Button>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
