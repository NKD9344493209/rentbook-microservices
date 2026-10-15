const { notifyUser } = require('./notify');

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');
const monthLabel = (key) => {
  const [y, m] = String(key).split('-').map(Number);
  return y && m ? new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : key;
};
const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/* One handler per business event. billing-service sends:
   { type, tenant: {_id,name}, owner: {_id,name}, bill?, complaint?, property? } */
const handlers = {
  'bill.issued': async (e) => [
    notifyUser({
      user: e.tenant._id,
      type: e.type,
      title: `New bill: ${monthLabel(e.bill.month)}`,
      message: `${rupees(e.bill.total)} is due by ${date(e.bill.dueDate)}${e.property?.name ? ` for ${e.property.name}` : ''}${e.bill.room ? `, room ${e.bill.room}` : ''}. Open RentBook to pay.`,
      link: '/bills',
      meta: { billId: e.bill._id },
    }),
  ],

  'bill.paid': async (e) => [
    notifyUser({
      user: e.owner._id,
      type: e.type,
      title: `Payment received: ${rupees(e.bill.total)}`,
      message: `${e.tenant.name} paid the ${monthLabel(e.bill.month)} bill${e.bill.room ? ` (room ${e.bill.room})` : ''}.`,
      link: '/owner/bills',
      meta: { billId: e.bill._id },
    }),
    notifyUser({
      user: e.tenant._id,
      type: e.type,
      title: 'Payment confirmed',
      message: `Your ${monthLabel(e.bill.month)} bill of ${rupees(e.bill.total)} is marked paid. Thank you.`,
      link: '/bills',
      meta: { billId: e.bill._id },
    }),
  ],

  'complaint.created': async (e) => [
    notifyUser({
      user: e.owner._id,
      type: e.type,
      title: `New repair request (${e.complaint.priority})`,
      message: `${e.tenant.name}${e.complaint.room && e.complaint.room !== '—' ? `, room ${e.complaint.room}` : ''}: ${e.complaint.title}. ${e.complaint.description}`,
      link: '/owner/complaints',
      meta: { complaintId: e.complaint._id },
    }),
  ],

  'complaint.updated': async (e) => {
    const label = e.complaint.status === 'resolved' ? 'resolved' : e.complaint.status === 'in-progress' ? 'in progress' : 'pending';
    return [
      notifyUser({
        user: e.tenant._id,
        type: e.type,
        title: e.complaint.status === 'resolved' ? `Resolved: ${e.complaint.title}` : `Update: ${e.complaint.title}`,
        message:
          e.complaint.status === 'resolved'
            ? `Your owner has marked "${e.complaint.title}" as resolved. Reply here if the problem is not fixed.`
            : `Your request "${e.complaint.title}" is now ${label}.`,
        link: '/complaints',
        meta: { complaintId: e.complaint._id },
      }),
    ];
  },

  'complaint.withdrawn': async (e) => [
    notifyUser({
      user: e.owner._id,
      type: e.type,
      title: 'Request withdrawn',
      message: `${e.tenant.name} withdrew "${e.complaint.title}".`,
      link: '/owner/complaints',
    }),
  ],
};

async function handleEvent(event) {
  const handler = handlers[event.type];
  if (!handler) return { handled: false };
  const results = await Promise.all(await handler(event));
  return { handled: true, notifications: results.length };
}

module.exports = { handleEvent, rupees, monthLabel, date };
