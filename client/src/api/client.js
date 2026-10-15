import axios from 'axios';

/* ---------------------------------------------------------------
   Two microservices, two API clients.
   user-service    -> auth, users, properties
   billing-service -> bills, payments, complaints, dashboards
   Locally both default to the Vite proxy prefixes. In production
   VITE_USER_API_URL / VITE_BILLING_API_URL hold the deployed URLs.
   --------------------------------------------------------------- */
export const SERVICE_URLS = {
  user: import.meta.env.VITE_USER_API_URL || '/user-api',
  billing: import.meta.env.VITE_BILLING_API_URL || '/billing-api',
  notify: import.meta.env.VITE_NOTIFY_API_URL || '/notify-api',
};

function createClient(baseURL, serviceName) {
  // 60s: a free-tier service can take ~50s to wake up on the first request.
  const http = axios.create({ baseURL, timeout: 60000 });

  http.interceptors.request.use((config) => {
    const token = localStorage.getItem('rentbook_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  http.interceptors.response.use(
    (res) => {
      if (res.headers['x-degraded']) {
        window.dispatchEvent(new CustomEvent('rentbook:degraded', { detail: res.headers['x-degraded'] }));
      }
      return res;
    },
    (error) => {
      const status = error.response?.status;
      const isAuthCall = error.config?.url?.startsWith('/auth/');
      if (status === 401 && !isAuthCall && localStorage.getItem('rentbook_token')) {
        window.dispatchEvent(new Event('rentbook:unauthorized'));
      }
      const message =
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED'
          ? `${serviceName} took too long to answer. Try again in a moment.`
          : `Could not reach ${serviceName}. If it runs on a free host it may be waking up, so wait a few seconds and try again.`);
      return Promise.reject(Object.assign(new Error(message), { status, service: serviceName }));
    }
  );
  return http;
}

const userHttp = createClient(SERVICE_URLS.user, 'user-service');
const billingHttp = createClient(SERVICE_URLS.billing, 'billing-service');
const notifyHttp = createClient(SERVICE_URLS.notify, 'notification-service');
const body = (request) => request.then((r) => r.data);

const probe = async (request) => {
  const started = performance.now();
  try {
    const res = await request;
    return { ok: true, ms: Math.round(performance.now() - started), data: res.data };
  } catch (error) {
    return { ok: false, ms: Math.round(performance.now() - started), error: error.message };
  }
};

export const api = {
  /* ---------- user-service ---------- */
  login: (email, password) => body(userHttp.post('/auth/login', { email, password })),
  register: (payload) => body(userHttp.post('/auth/register', payload)),
  getProperties: () => body(userHttp.get('/properties')),
  createProperty: (payload) => body(userHttp.post('/properties', payload)),
  updateProperty: (id, payload) => body(userHttp.put(`/properties/${id}`, payload)),
  deleteProperty: (id) => body(userHttp.delete(`/properties/${id}`)),
  getTenants: () => body(userHttp.get('/users/tenants')),

  /* ---------- billing-service ---------- */
  getTenantSummary: () => body(billingHttp.get('/tenant/summary')),
  getOwnerStats: () => body(billingHttp.get('/owner/stats')),
  getBills: () => body(billingHttp.get('/bills')),
  createBill: (payload) => body(billingHttp.post('/bills', payload)),
  updateBill: (id, payload) => body(billingHttp.put(`/bills/${id}`, payload)),
  deleteBill: (id) => body(billingHttp.delete(`/bills/${id}`)),
  payBill: (id) => body(billingHttp.post(`/bills/${id}/pay`)),
  getComplaints: () => body(billingHttp.get('/complaints')),
  createComplaint: (payload) => body(billingHttp.post('/complaints', payload)),
  updateComplaintStatus: (id, status) => body(billingHttp.put(`/complaints/${id}`, { status })),
  deleteComplaint: (id) => body(billingHttp.delete(`/complaints/${id}`)),

  /* ---------- notification-service ---------- */
  getNotifications: (params) => body(notifyHttp.get('/notifications', { params })),
  markAllRead: () => body(notifyHttp.put('/notifications/read-all')),
  markRead: (id) => body(notifyHttp.put(`/notifications/${id}/read`)),
  telegramStatus: () => body(notifyHttp.get('/telegram/status')),
  telegramLinkCode: () => body(notifyHttp.post('/telegram/link-code')),
  telegramUnlink: () => body(notifyHttp.delete('/telegram/link')),
  telegramTest: () => body(notifyHttp.post('/telegram/test')),
  sendRemindersNow: () => body(notifyHttp.post('/jobs/digest')),

  /* ---------- health (status page + warm-up) ---------- */
  health: {
    user: () => probe(userHttp.get('/health')),
    billing: () => probe(billingHttp.get('/health')),
    notify: () => probe(notifyHttp.get('/health')),
    userToBilling: () => probe(userHttp.get('/health/dependencies')),
    billingToUser: () => probe(billingHttp.get('/health/dependencies')),
    notifyToBoth: () => probe(notifyHttp.get('/health/dependencies')),
  },
};
