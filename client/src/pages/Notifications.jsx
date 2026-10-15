import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card, CardHeader, Empty, Loader, Notice, PageHeader } from '../components/ui.jsx';
import { Send, Phone, Check, Bell } from '../components/Icons.jsx';
import { formatDate, relative } from '../utils/format.js';

/* Telegram connection + full notification history. Served by notification-service. */
export default function Notifications() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [status, setStatus] = useState(null);
  const [code, setCode] = useState(null);
  const [feed, setFeed] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState('');

  const load = () =>
    Promise.all([api.telegramStatus(), api.getNotifications({ limit: 50 })])
      .then(([s, f]) => {
        setStatus(s);
        setFeed(f);
        setError('');
      })
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const run = async (name, fn, okMessage) => {
    setBusy(name);
    setError('');
    setInfo('');
    try {
      const r = await fn();
      if (okMessage) setInfo(typeof okMessage === 'function' ? okMessage(r) : okMessage);
      await load();
      return r;
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy('');
    }
  };

  const getCode = () => run('code', api.telegramLinkCode).then((c) => c && setCode(c));
  const unlink = () => run('unlink', api.telegramUnlink, 'Telegram disconnected.').then(() => setCode(null));
  const test = () => run('test', api.telegramTest, (r) => (r.delivered ? 'Test alert sent to your Telegram.' : 'Test alert saved in the app (Telegram not linked or in console mode).'));
  const remind = () => run('remind', api.sendRemindersNow, (r) => `Reminders sent: ${r.notifications} notification(s) to ${r.owners} owner(s) and ${r.tenants} tenant(s).`);
  const markAll = () => run('read', api.markAllRead);

  if (error && !status) return <Notice onRetry={load}>{error}</Notice>;
  if (!status || !feed) return <Loader rows={2} />;

  return (
    <>
      <PageHeader title="Notifications" subtitle="Alerts on your phone through Telegram, plus the full history here.">
        {isOwner && (
          <Button variant="coral" onClick={remind} disabled={busy === 'remind'}>
            <Send width={16} height={16} /> {busy === 'remind' ? 'Sending…' : 'Send reminders now'}
          </Button>
        )}
      </PageHeader>

      {error && <Notice className="mb-4">{error}</Notice>}
      {info && <Notice tone="success" className="mb-4">{info}</Notice>}

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4 items-start">
        <Card>
          <CardHeader title="Telegram" subtitle={status.linked ? `Connected as ${status.telegramName}` : 'Not connected'} />
          <div className="px-5 pb-5 space-y-4">
            {!status.enabled && (
              <Notice tone="warn">Bot token not configured on the server. Alerts are stored here in the app; Telegram delivery is off.</Notice>
            )}

            {status.linked ? (
              <>
                <div className="flex items-center gap-3 rounded-xl bg-green-soft text-green px-4 py-3">
                  <Check />
                  <div className="text-sm">
                    <p className="font-bold">Alerts go to your Telegram</p>
                    <p className="text-xs opacity-80">Linked {formatDate(status.linkedAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-muted">
                  {isOwner
                    ? 'You get new repair requests, payments received, tenant messages and a daily summary of unpaid rent. Reply to a forwarded tenant message in Telegram to answer them.'
                    : 'You get new bills, due-date reminders, overdue alerts and repair updates. Type any message to the bot and it reaches your owner.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="soft" onClick={test} disabled={busy === 'test'}>{busy === 'test' ? 'Sending…' : 'Send test alert'}</Button>
                  <Button variant="ghost" onClick={unlink} disabled={busy === 'unlink'}>Disconnect</Button>
                </div>
              </>
            ) : (
              <>
                <ol className="text-sm space-y-3">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-deep text-xs font-bold flex items-center justify-center shrink-0">1</span>
                    <span>
                      Open the bot in Telegram:{' '}
                      {status.botLink ? (
                        <a href={status.botLink} target="_blank" rel="noreferrer" className="text-accent font-semibold hover:underline">@{status.botUsername}</a>
                      ) : (
                        <span className="text-muted">(bot username not set)</span>
                      )}{' '}
                      and press <b>Start</b>.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-deep text-xs font-bold flex items-center justify-center shrink-0">2</span>
                    <span>Generate a code here and send it to the bot.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-accent-soft text-accent-deep text-xs font-bold flex items-center justify-center shrink-0">3</span>
                    <span>Done. The bot confirms and this page updates.</span>
                  </li>
                </ol>

                {code ? (
                  <div className="rounded-xl border border-line bg-soft p-4">
                    <p className="text-xs text-muted mb-1">Send this to the bot (valid 10 minutes)</p>
                    <p className="font-mono text-2xl font-extrabold tracking-widest select-all">{code.command}</p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(code.command)}>Copy</Button>
                      {status.botLink && (
                        <a href={status.botLink} target="_blank" rel="noreferrer"><Button size="sm">Open Telegram</Button></a>
                      )}
                      <Button size="sm" variant="ghost" onClick={load}>I sent it, refresh</Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={getCode} disabled={busy === 'code'}>
                    <Phone width={16} height={16} /> {busy === 'code' ? 'Generating…' : 'Connect Telegram'}
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="History"
            subtitle={`${feed.unread} unread`}
            action={feed.unread > 0 ? <button onClick={markAll} className="text-xs font-semibold text-accent">Mark all read</button> : null}
          />
          {feed.items.length === 0 ? (
            <Empty title="Nothing yet" hint="Bills, payments, repair updates and reminders will appear here." />
          ) : (
            <ul className="px-2 pb-3">
              {feed.items.map((n) => (
                <li key={n._id} className={`flex gap-3 px-3 py-3 rounded-xl ${n.read ? '' : 'bg-accent-soft/40'}`}>
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-soft text-muted' : 'bg-accent-soft text-accent-deep'}`}>
                    <Bell width={16} height={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.title}</p>
                    <p className="text-xs text-muted mt-0.5 whitespace-pre-line">{n.message}</p>
                    <p className="text-[11px] text-muted/70 mt-1">
                      {relative(n.createdAt)} · {n.channel === 'telegram' ? (n.telegramStatus === 'sent' ? 'Telegram' : n.telegramStatus === 'console' ? 'Telegram (console mode)' : 'Telegram failed') : 'in-app'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
