require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const requestLogger = require('./middleware/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const bot = require('./telegram/bot');
const digest = require('./jobs/digest');

const notificationRoutes = require('./routes/notificationRoutes');
const telegramRoutes = require('./routes/telegramRoutes');
const jobRoutes = require('./routes/jobRoutes');
const internalRoutes = require('./routes/internalRoutes');
const healthRoutes = require('./routes/healthRoutes');
const { webhook } = require('./controllers/telegramController');

/* ---------------------------------------------------------------
   RentBook :: notification-service
   Owns: Telegram links, notification feed, reminders.  DB: rentbook_notifications
   Receives events from billing-service; asks user-service for names and
   billing-service for the daily digest facts.
   --------------------------------------------------------------- */
const SERVICE = 'notification-service';
const app = express();

const allowed = (process.env.CLIENT_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : true, exposedHeaders: ['x-request-id', 'x-served-by'] }));
app.use(express.json());
app.use(requestLogger(SERVICE));

app.get('/', (req, res) => res.json({ service: SERVICE, docs: '/api/health' }));

// Public API (JWT)
app.use('/api/health', healthRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/jobs', jobRoutes);

// Telegram calls this when the bot runs in webhook mode
app.post('/telegram/webhook/:secret', webhook);

// Internal API (x-service-key): events from billing-service, cron pinger
app.use('/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5003;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`${SERVICE} running on http://localhost:${PORT}`);
    bot.start();
    digest.schedule();
  });
});
