require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const billRoutes = require('./routes/billRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const internalRoutes = require('./routes/internalRoutes');
const healthRoutes = require('./routes/healthRoutes');

/* ---------------------------------------------------------------
   RentBook :: billing-service
   Owns: bills, payments, complaints, dashboards.  Database: rentbook_billing
   Talks to: user-service (tenant checks, names, properties).
   --------------------------------------------------------------- */
const SERVICE = 'billing-service';
const app = express();

const allowed = (process.env.CLIENT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({ origin: allowed.length ? allowed : true, exposedHeaders: ['x-request-id', 'x-served-by', 'x-degraded'] })
);
app.use(express.json());
app.use(requestLogger(SERVICE));

app.get('/', (req, res) => res.json({ service: SERVICE, docs: '/api/health' }));

// Public API: called by the React frontend
app.use('/api/health', healthRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api', dashboardRoutes); // /api/tenant/summary, /api/owner/stats

// Internal API: called only by user-service (needs x-service-key)
app.use('/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5002;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`${SERVICE} running on http://localhost:${PORT}`));
});
