import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Button, Card, Drawer, Empty, Field, Loader, Notice, PageHeader, Pill, Select, TextArea } from '../components/ui.jsx';
import { Plus, Wrench } from '../components/Icons.jsx';
import { formatDate } from '../utils/format.js';

const STAGES = ['pending', 'in-progress', 'resolved'];
const blank = { title: '', description: '', priority: 'medium', room: '' };

export default function Complaints() {
  const { data: complaints, setData: setComplaints, error: loadError, loading, reload } = useApi(api.getComplaints);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await api.createComplaint(form);
      setComplaints((prev) => [created, ...prev]);
      setForm(blank);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (c) => {
    if (!window.confirm(`Withdraw "${c.title}"?`)) return;
    setError('');
    try {
      await api.deleteComplaint(c._id);
      setComplaints((prev) => prev.filter((x) => x._id !== c._id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loader />;
  if (loadError) return <Notice onRetry={reload}>{loadError}</Notice>;

  return (
    <>
      <PageHeader title="My requests" subtitle="Repairs and issues in your room">
        <Button variant="coral" onClick={() => { setError(''); setOpen(true); }}><Plus width={16} height={16} /> Report an issue</Button>
      </PageHeader>
      {error && !open && <Notice className="mb-4">{error}</Notice>}

      {complaints.length === 0 ? (
        <Card><Empty title="Nothing reported yet" hint="Something broken in your room? Report it and track the fix here." action={<Button onClick={() => setOpen(true)}>Report an issue</Button>} /></Card>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <Card key={c._id} className="p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span className="w-11 h-11 rounded-xl bg-accent-soft text-accent-deep flex items-center justify-center shrink-0"><Wrench /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{c.title}</p>
                    <Pill status={c.priority} dot={false} />
                  </div>
                  <p className="text-sm text-muted mt-1">{c.description}</p>
                  <p className="text-[11px] text-muted mt-2">Room {c.room} · raised {formatDate(c.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill status={c.status} />
                  {c.status === 'pending' && <Button variant="ghost" size="sm" onClick={() => withdraw(c)}>Withdraw</Button>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {STAGES.map((stage, i) => {
                  const reached = STAGES.indexOf(c.status) >= i;
                  return (
                    <div key={stage} className="flex-1">
                      <div className={`h-1.5 rounded-full ${reached ? 'bg-accent' : 'bg-line'}`} />
                      <p className={`text-[11px] mt-1.5 capitalize ${reached ? 'text-accent-deep font-semibold' : 'text-muted'}`}>{stage.replace('-', ' ')}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Drawer open={open} onClose={() => setOpen(false)} title="Report an issue">
        <form onSubmit={submit} className="space-y-4">
          <Field label="What is wrong" name="title" value={form.title} onChange={change} placeholder="Water leakage" required />
          <TextArea label="Details" name="description" value={form.description} onChange={change} rows={4} required placeholder="Where it is, when it started, how bad it is." />
          <Select label="Priority" name="priority" value={form.priority} onChange={change}>
            <option value="low">Low: can wait a week</option>
            <option value="medium">Medium: this week</option>
            <option value="high">High: urgent</option>
          </Select>
          <Field label="Room (optional)" name="room" value={form.room} onChange={change} placeholder="Taken from your bill if empty" />
          {error && <Notice>{error}</Notice>}
          <div className="flex gap-2">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Sending…' : 'Send to owner'}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </Drawer>
    </>
  );
}
