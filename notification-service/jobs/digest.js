const cron = require('node-cron');
const clients = require('../utils/clients');
const { notifyUser } = require('../utils/notify');
const { rupees, monthLabel, date } = require('../utils/events');

/* ---------------------------------------------------------------
   Reminders the owner would otherwise have to check the app for.
   billing-service computes the facts (/internal/digest); this job
   turns them into messages:
     - each owner: who hasn't paid, what is overdue, repairs waiting
     - each tenant: bill due soon / overdue
   Runs on a schedule and on demand (POST /api/jobs/digest).
   --------------------------------------------------------------- */
async function runDigest(requestId = 'cron') {
  const digest = await clients.getDigest(requestId);
  const { owners = [], tenants = [] } = digest || {};
  let sent = 0;

  for (const o of owners) {
    const lines = [];
    if (o.overdue.length) {
      lines.push(`Overdue (${o.overdue.length}): ` + o.overdue.map((b) => `${b.tenantName} ${rupees(b.total)} for ${monthLabel(b.month)}, due ${date(b.dueDate)}`).join('; '));
    }
    if (o.dueSoon.length) {
      lines.push(`Due soon (${o.dueSoon.length}): ` + o.dueSoon.map((b) => `${b.tenantName} ${rupees(b.total)} by ${date(b.dueDate)}`).join('; '));
    }
    if (o.staleComplaints.length) {
      lines.push(`Repairs waiting 3+ days (${o.staleComplaints.length}): ` + o.staleComplaints.map((c) => `${c.title} (${c.tenantName})`).join('; '));
    }
    if (!lines.length) continue;
    await notifyUser({
      user: o.owner,
      type: 'digest.owner',
      title: `Daily summary: ${rupees(o.pendingAmount)} unpaid, ${o.openComplaints} open repairs`,
      message: lines.join('\n'),
      link: '/owner',
    });
    sent += 1;
  }

  for (const t of tenants) {
    for (const b of t.overdue) {
      await notifyUser({
        user: t.tenant,
        type: 'reminder.overdue',
        title: `Overdue: ${monthLabel(b.month)} bill`,
        message: `${rupees(b.total)} was due on ${date(b.dueDate)}. Please pay as soon as possible.`,
        link: '/bills',
        meta: { billId: b._id },
      });
      sent += 1;
    }
    for (const b of t.dueSoon) {
      await notifyUser({
        user: t.tenant,
        type: 'reminder.due',
        title: `Reminder: ${monthLabel(b.month)} bill due ${date(b.dueDate)}`,
        message: `${rupees(b.total)} is due in ${b.daysLeft} day(s).`,
        link: '/bills',
        meta: { billId: b._id },
      });
      sent += 1;
    }
  }

  console.log(`[digest] owners=${owners.length} tenants=${tenants.length} notifications=${sent}`);
  return { owners: owners.length, tenants: tenants.length, notifications: sent };
}

function schedule() {
  const expr = process.env.DIGEST_CRON || '30 3 * * *';
  if (!cron.validate(expr)) {
    console.warn(`[digest] invalid DIGEST_CRON "${expr}", scheduler disabled`);
    return;
  }
  cron.schedule(expr, () => runDigest('cron').catch((e) => console.warn('[digest] failed:', e.message)));
  console.log(`[digest] scheduled with cron "${expr}" (UTC)`);
}

module.exports = { runDigest, schedule };
