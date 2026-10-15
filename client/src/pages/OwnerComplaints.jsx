import { useState } from 'react';
import { api } from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { Avatar, Button, Card, Loader, Notice, PageHeader, Pill } from '../components/ui.jsx';
import { relative } from '../utils/format.js';

/* Kanban-style maintenance board: pending -> in progress -> resolved. */
const COLUMNS = [
  { status: 'pending', title: 'New', next: 'in-progress', action: 'Start work' },
  { status: 'in-progress', title: 'In progress', next: 'resolved', action: 'Mark resolved' },
  { status: 'resolved', title: 'Resolved' },
];

export default function OwnerComplaints() {
  const { data: complaints, setData: setComplaints, error: loadError, loading, reload } = useApi(api.getComplaints);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const move = async (c, status) => {
    setBusyId(c._id);
    setError('');
    try {
      const updated = await api.updateComplaintStatus(c._id, status);
      setComplaints((prev) => prev.map((x) => (x._id === c._id ? { ...x, status: updated.status } : x)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;
  if (loadError) return <Notice onRetry={reload}>{loadError}</Notice>;

  const open = complaints.filter((c) => c.status !== 'resolved').length;

  return (
    <>
      <PageHeader title="Maintenance" subtitle={`${open} open request(s) · ${complaints.length} total`} />
      {error && <Notice className="mb-4">{error}</Notice>}

      <div className="grid md:grid-cols-3 gap-4 items-start">
        {COLUMNS.map((col) => {
          const items = complaints.filter((c) => c.status === col.status);
          return (
            <div key={col.status} className="rounded-2xl bg-soft/70 border border-line p-3">
              <div className="flex items-center justify-between px-2 pb-3">
                <p className="font-bold text-sm">{col.title}</p>
                <span className="tnum text-xs font-bold bg-surface border border-line rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.length === 0 && <p className="text-xs text-muted text-center py-6">Nothing here</p>}
                {items.map((c) => (
                  <Card key={c._id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-snug">{c.title}</p>
                      <Pill status={c.priority} dot={false} />
                    </div>
                    <p className="text-xs text-muted mt-1.5 line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-2 mt-3 text-[11px] text-muted">
                      <Avatar name={c.tenant?.name} size="sm" />
                      <span className="truncate">{c.tenant?.name}</span>
                      {c.room && c.room !== '—' && <span>· Room {c.room}</span>}
                      <span className="ml-auto whitespace-nowrap">{relative(c.createdAt)}</span>
                    </div>
                    {col.next && (
                      <Button size="sm" variant={col.status === 'pending' ? 'primary' : 'soft'} className="w-full mt-3" onClick={() => move(c, col.next)} disabled={busyId === c._id}>
                        {busyId === c._id ? 'Saving…' : col.action}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
