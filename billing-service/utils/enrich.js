const userService = require('./userServiceClient');

const unique = (values) => [...new Set(values.filter(Boolean).map(String))];
const isOutage = (error) => error.status === 502 || error.status === 503;

/* Bills and complaints store only tenant/property ids. Their names live in
   user-service, so we fetch them in two batched REST calls and merge.

   If user-service is down we do NOT fail the whole request: the records
   still come back, with placeholder names and degraded = true. This is
   graceful degradation: billing keeps working when its dependency doesn't. */
async function attachUserData(docs, requestId) {
  const plain = docs.map((d) => (typeof d.toJSON === 'function' ? d.toJSON() : d));
  const tenantIds = unique(plain.map((d) => d.tenant));
  const propertyIds = unique(plain.map((d) => d.property));

  let users = [];
  let properties = [];
  let degraded = false;

  try {
    [users, properties] = await Promise.all([
      tenantIds.length ? userService.getUsers(tenantIds, requestId) : [],
      propertyIds.length ? userService.getProperties(propertyIds, requestId) : [],
    ]);
  } catch (error) {
    if (!isOutage(error)) throw error;
    degraded = true;
  }

  const userById = new Map((users || []).map((u) => [String(u._id), u]));
  const propertyById = new Map((properties || []).map((p) => [String(p._id), p]));

  const items = plain.map((d) => ({
    ...d,
    tenant: userById.get(String(d.tenant)) || {
      _id: d.tenant,
      name: degraded ? 'Name unavailable' : 'Former tenant',
      email: '',
      unavailable: true,
    },
    property: d.property
      ? propertyById.get(String(d.property)) || {
          _id: d.property,
          name: degraded ? 'Property unavailable' : 'Removed property',
          unavailable: true,
        }
      : null,
  }));

  return { items, degraded };
}

// Tells the frontend (via a response header) that some data came from a fallback.
const markDegraded = (res, degraded) => {
  if (degraded) res.set('x-degraded', 'user-service');
};

module.exports = { attachUserData, markDegraded, isOutage };
