import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Button, Card, Drawer, Empty, Field, Loader, Notice, PageHeader } from '../components/ui.jsx';
import { Donut } from '../components/charts.jsx';
import { Plus, Edit, Trash, Building } from '../components/Icons.jsx';
import { rupees } from '../utils/format.js';

const blank = { name: '', address: '', rooms: '', occupied: '', monthlyRent: '' };

export default function OwnerProperties() {
  const { data: properties, setData: setProperties, error: loadError, loading, reload } = useApi(api.getProperties);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const close = () => {
    setOpen(false);
    setEditingId(null);
    setForm(blank);
  };
  const startAdd = () => {
    setError('');
    setSuccess('');
    setForm(blank);
    setEditingId(null);
    setOpen(true);
  };
  const startEdit = (p) => {
    setError('');
    setSuccess('');
    setEditingId(p._id);
    setForm({ name: p.name, address: p.address, rooms: String(p.rooms), occupied: String(p.occupied), monthlyRent: String(p.monthlyRent) });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      rooms: Number(form.rooms),
      occupied: Number(form.occupied) || 0,
      monthlyRent: Number(form.monthlyRent),
    };
    try {
      if (editingId) {
        const updated = await api.updateProperty(editingId, payload);
        setProperties((prev) => prev.map((p) => (p._id === editingId ? updated : p)));
        setSuccess(`${updated.name} saved.`);
      } else {
        const created = await api.createProperty(payload);
        setProperties((prev) => [created, ...prev]);
        setSuccess(`${created.name} added.`);
      }
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // user-service asks billing-service for unpaid bills before deleting.
  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name}? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteProperty(p._id);
      setProperties((prev) => prev.filter((x) => x._id !== p._id));
      setSuccess(`${p.name} removed.`);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loader />;
  if (loadError) return <Notice onRetry={reload}>{loadError}</Notice>;

  const totals = properties.reduce(
    (t, p) => ({ rooms: t.rooms + p.rooms, occupied: t.occupied + p.occupied, rent: t.rent + p.occupied * p.monthlyRent }),
    { rooms: 0, occupied: 0, rent: 0 }
  );

  return (
    <>
      <PageHeader title="Properties" subtitle={`${properties.length} building(s) · ${totals.occupied}/${totals.rooms} rooms filled · ${rupees(totals.rent)} expected per month`}>
        <Button variant="coral" onClick={startAdd}><Plus width={16} height={16} /> Add property</Button>
      </PageHeader>

      {error && <Notice className="mb-4">{error}</Notice>}
      {success && <Notice tone="success" className="mb-4">{success}</Notice>}

      {properties.length === 0 ? (
        <Card>
          <Empty title="No properties yet" hint="Add your first building to start billing tenants." action={<Button onClick={startAdd}>Add property</Button>} />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {properties.map((p) => (
            <Card key={p._id} className="p-5">
              <div className="flex items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent-deep flex items-center justify-center shrink-0"><Building /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-lg leading-tight truncate">{p.name}</p>
                  <p className="text-sm text-muted truncate">{p.address}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(p)} className="p-2 rounded-lg text-muted hover:bg-soft hover:text-ink" title="Edit"><Edit width={18} height={18} /></button>
                  <button onClick={() => remove(p)} className="p-2 rounded-lg text-muted hover:bg-red-soft hover:text-red" title="Delete"><Trash width={18} height={18} /></button>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-5">
                <Donut value={p.occupied} total={p.rooms} label="filled" size={96} />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div><p className="text-[11px] text-muted">Rooms</p><p className="tnum font-bold">{p.rooms}</p></div>
                  <div><p className="text-[11px] text-muted">Occupied</p><p className="tnum font-bold text-green">{p.occupied}</p></div>
                  <div><p className="text-[11px] text-muted">Rent / room</p><p className="tnum font-bold">{rupees(p.monthlyRent)}</p></div>
                  <div><p className="text-[11px] text-muted">Expected</p><p className="tnum font-bold">{rupees(p.occupied * p.monthlyRent)}</p></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={open} onClose={close} title={editingId ? 'Edit property' : 'New property'}>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Property name" name="name" value={form.name} onChange={change} placeholder="Sunrise Residency" required />
          <Field label="Address" name="address" value={form.address} onChange={change} placeholder="Peelamedu, Coimbatore" required />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Rooms" name="rooms" type="number" min="1" value={form.rooms} onChange={change} required />
            <Field label="Occupied" name="occupied" type="number" min="0" max={form.rooms || undefined} value={form.occupied} onChange={change} />
          </div>
          <Field label="Rent per room (₹)" name="monthlyRent" type="number" min="0" value={form.monthlyRent} onChange={change} required />
          {error && <Notice>{error}</Notice>}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add property'}</Button>
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
