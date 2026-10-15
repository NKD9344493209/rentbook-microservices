/* ---------------------------------------------------------------
   Seeds demo data THROUGH THE PUBLIC APIs (not the database), so it
   works the same against localhost or the deployed services and
   exercises the inter-service calls while it runs.

   Usage (Node 18+, no install needed):
     node scripts/seed-demo.mjs
     node scripts/seed-demo.mjs https://<user-service>.onrender.com https://<billing-service>.onrender.com

   Safe to run more than once: existing accounts/bills are reused.
   --------------------------------------------------------------- */

const USER = (process.argv[2] || process.env.USER_URL || 'http://localhost:5001').replace(/\/$/, '');
const BILLING = (process.argv[3] || process.env.BILLING_URL || 'http://localhost:5002').replace(/\/$/, '');
const PASSWORD = '123456';

async function call(base, method, path, { token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000), // allow for a free-tier cold start
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function account(name, email, role) {
  let r = await call(USER, 'POST', '/api/auth/register', { body: { name, email, password: PASSWORD, role } });
  if (r.status === 409) r = await call(USER, 'POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  if (r.status >= 300) throw new Error(`${email}: ${r.data.message}`);
  console.log(`  ✓ ${role.padEnd(6)} ${email}`);
  return { token: r.data.token, id: r.data.user._id };
}

const monthKey = (offset) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dueDate = (key) => `${key}-10`;

async function main() {
  console.log(`user-service:    ${USER}\nbilling-service: ${BILLING}\n`);

  console.log('Waking services…');
  for (const base of [USER, BILLING]) {
    const r = await call(base, 'GET', '/api/health');
    if (r.status !== 200) throw new Error(`${base} is not healthy (${r.status})`);
  }

  console.log('Accounts (user-service):');
  const owner = await account('Ravi Kumar', 'owner@rentbook.in', 'owner');
  const tenant = await account('Nila Sundar', 'tenant@rentbook.in', 'tenant');
  const tenant2 = await account('Arun Prakash', 'arun@rentbook.in', 'tenant');

  console.log('Properties (user-service):');
  let { data: properties } = await call(USER, 'GET', '/api/properties', { token: owner.token });
  const wanted = [
    { name: 'Sunrise Residency', address: 'Peelamedu, Coimbatore', rooms: 12, occupied: 10, monthlyRent: 6500 },
    { name: 'Green Court PG', address: 'Gandhipuram, Coimbatore', rooms: 20, occupied: 14, monthlyRent: 5200 },
  ];
  for (const p of wanted) {
    if (!properties.find((x) => x.name === p.name)) {
      const r = await call(USER, 'POST', '/api/properties', { token: owner.token, body: p });
      if (r.status !== 201) throw new Error(r.data.message);
    }
    console.log(`  ✓ ${p.name}`);
  }
  ({ data: properties } = await call(USER, 'GET', '/api/properties', { token: owner.token }));
  const sunrise = properties.find((p) => p.name === 'Sunrise Residency');
  const green = properties.find((p) => p.name === 'Green Court PG');

  console.log('Bills (billing-service validates each one with user-service):');
  const plan = [
    { who: tenant, property: sunrise, room: '204', offset: -2, electricity: 610, pay: true },
    { who: tenant, property: sunrise, room: '204', offset: -1, electricity: 720, pay: true },
    { who: tenant, property: sunrise, room: '204', offset: 0, electricity: 680, pay: false },
    { who: tenant2, property: green, room: 'B12', offset: -1, electricity: 450, pay: true },
    { who: tenant2, property: green, room: 'B12', offset: 0, electricity: 520, pay: false },
  ];
  for (const b of plan) {
    const month = monthKey(b.offset);
    const r = await call(BILLING, 'POST', '/api/bills', {
      token: owner.token,
      body: {
        tenant: b.who.id,
        property: b.property._id,
        room: b.room,
        month,
        rent: b.property.monthlyRent,
        electricity: b.electricity,
        water: 250,
        internet: 500,
        dueDate: dueDate(month),
      },
    });
    if (r.status === 201 && b.pay) {
      await call(BILLING, 'POST', `/api/bills/${r.data._id}/pay`, { token: b.who.token });
    }
    console.log(`  ${r.status === 201 ? '✓' : '•'} ${month} ${b.room} ${r.status === 201 ? (b.pay ? 'issued + paid' : 'issued') : '(already exists)'}`);
  }

  console.log('Complaints (billing-service):');
  const { data: existing } = await call(BILLING, 'GET', '/api/complaints', { token: tenant.token });
  if (!existing.length) {
    const c1 = await call(BILLING, 'POST', '/api/complaints', {
      token: tenant.token,
      body: { title: 'Water leakage', description: 'Kitchen sink drips through the night.', priority: 'high' },
    });
    await call(BILLING, 'PUT', `/api/complaints/${c1.data._id}`, { token: owner.token, body: { status: 'in-progress' } });
    await call(BILLING, 'POST', '/api/complaints', {
      token: tenant.token,
      body: { title: 'Wi-Fi slow after 9pm', description: 'Speeds drop badly in the evening.', priority: 'low' },
    });
    await call(BILLING, 'POST', '/api/complaints', {
      token: tenant2.token,
      body: { title: 'Fan not working', description: 'Ceiling fan stopped spinning.', priority: 'medium' },
    });
  }
  console.log('  ✓ complaints ready');

  console.log(`\nDone. Log in with owner@rentbook.in or tenant@rentbook.in, password ${PASSWORD}.`);
}

main().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});
