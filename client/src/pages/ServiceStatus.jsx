import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, SERVICE_URLS } from '../api/client.js';
import { Button, Card, PageHeader } from '../components/ui.jsx';

/* Proves the deployment works: each service is reachable from the browser,
   and each service can reach the other. Opening it also wakes sleeping
   free-tier services before a demo. */
const CHECKS = [
  { key: 'user', title: 'user-service', detail: 'Auth, users, properties', url: SERVICE_URLS.user, run: api.health.user },
  { key: 'billing', title: 'billing-service', detail: 'Bills, payments, complaints, dashboards', url: SERVICE_URLS.billing, run: api.health.billing },
  { key: 'notify', title: 'notification-service', detail: 'Telegram alerts, reminders, in-app feed', url: SERVICE_URLS.notify, run: api.health.notify },
  { key: 'b2u', title: 'billing-service → user-service', detail: 'Tenant checks, names, property data', run: api.health.billingToUser },
  { key: 'u2b', title: 'user-service → billing-service', detail: 'Unpaid-bill check before a property is deleted', run: api.health.userToBilling },
  { key: 'n2x', title: 'notification-service → user + billing', detail: 'Names for alerts, facts for the daily digest', run: api.health.notifyToBoth },
];

export default function ServiceStatus({ standalone = false }) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(true);

  const execute = useCallback(
    () =>
      Promise.all(
        CHECKS.map(async (check) => {
          const result = await check.run();
          const ok = result.ok && (result.data?.reachable ?? true);
          setResults((prev) => ({ ...prev, [check.key]: { ...result, ok } }));
        })
      ).finally(() => setRunning(false)),
    []
  );

  useEffect(() => {
    execute();
  }, [execute]);

  const runAll = () => {
    setRunning(true);
    setResults({});
    execute();
  };

  const okCount = CHECKS.filter((c) => results[c.key]?.ok).length;
  const allOk = okCount === CHECKS.length;

  const content = (
    <>
      <PageHeader
        title="Service status"
        subtitle={
          running
            ? 'Checking each microservice. A sleeping service can take up to a minute to wake.'
            : allOk
              ? 'All microservices are up and can talk to each other.'
              : 'Something is not reachable. Details below.'
        }
      >
        <Button variant="ghost" onClick={runAll} disabled={running}>
          {running ? 'Checking…' : 'Check again'}
        </Button>
      </PageHeader>

      <Card className="p-5 mb-4 flex items-center gap-5">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-extrabold ${allOk ? 'bg-green-soft text-green' : 'bg-amber-soft text-amber'}`}>
          {okCount}/{CHECKS.length}
        </div>
        <div>
          <p className="font-bold">{allOk ? 'All systems operational' : running ? 'Running checks' : 'Degraded'}</p>
          <p className="text-xs text-muted">Three independent services, three databases, REST between them.</p>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {CHECKS.map((check) => {
          const r = results[check.key];
          const state = !r ? 'pending' : r.ok ? 'ok' : 'down';
          const dot = state === 'ok' ? 'bg-green' : state === 'down' ? 'bg-red' : 'bg-line animate-pulse';
          return (
            <Card key={check.key} className="p-5">
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{check.title}</p>
                  <p className="text-xs text-muted">{check.detail}</p>
                  {check.url && <p className="text-[11px] text-muted/70 mt-1 break-all">{check.url}</p>}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-line text-sm flex items-center justify-between">
                {!r && <span className="text-muted">Checking…</span>}
                {r?.ok && (
                  <>
                    <span className="font-bold text-green">Reachable</span>
                    <span className="tnum text-xs text-muted">
                      {r.ms} ms{r.data?.latencyMs !== undefined ? ` · hop ${r.data.latencyMs} ms` : ''}
                    </span>
                  </>
                )}
                {r && !r.ok && (
                  <>
                    <span className="font-bold text-red">Not reachable</span>
                    <span className="text-xs text-muted text-right max-w-[60%]">{r.data?.message || r.error}</span>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );

  if (!standalone) return content;
  return (
    <div className="min-h-screen px-5 sm:px-8 py-10 max-w-4xl mx-auto">
      <Link to="/" className="flex items-center gap-2 mb-8">
        <span className="w-8 h-8 rounded-lg bg-coral text-white flex items-center justify-center font-extrabold">R</span>
        <span className="font-extrabold text-lg">RentBook</span>
      </Link>
      {content}
    </div>
  );
}
