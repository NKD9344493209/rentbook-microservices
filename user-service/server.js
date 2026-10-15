require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const internalRoutes = require('./routes/internalRoutes');
const healthRoutes = require('./routes/healthRoutes');

/* ---------------------------------------------------------------
   RentBook :: user-service
   Owns: users (auth) and properties.     Database: rentbook_users
   Talks to: billing-service (before a property is deleted).
   --------------------------------------------------------------- */
const SERVICE = 'user-service';
const app = express();

const allowed = (process.env.CLIENT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : true, exposedHeaders: ['x-request-id', 'x-served-by'] }));
app.use(express.json());
app.use(requestLogger(SERVICE));

app.get('/', (req, res) => res.json({ service: SERVICE, docs: '/api/health' }));

// Public API: called by the React frontend
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);

// Internal API: called only by billing-service (needs x-service-key)
app.use('/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Start listening only after the database is connected.
connectDB().then(() => {
  app.listen(PORT, () => console.log(`${SERVICE} running on http://localhost:${PORT}`));
});
