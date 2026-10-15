# Telegram alerts: setup (5 minutes)

RentBook's notification-service sends alerts to owners and tenants on Telegram:

| Who | Gets |
|---|---|
| Owner | New repair request, payment received, tenant messages, daily summary of unpaid rent and repairs waiting 3+ days |
| Tenant | New bill, due-date reminder, overdue alert, repair status changes (in progress / resolved), owner replies |

Tenants can type **any message** to the bot and it is forwarded to their owner. The owner answers by using Telegram's **Reply** on that message, and the answer reaches the tenant.

Without a bot token the service runs in **console mode**: every alert still appears in the app (bell icon + Notifications page), it just isn't pushed to a phone.

## 1. Create the bot (one time)

1. In Telegram, open **@BotFather** and send `/newbot`.
2. Name: `RentBook Alerts`. Username: something ending in `bot`, e.g. `RentBookAlertsBot` (must be unique).
3. BotFather replies with a **token** like `7123456789:AAH...`. Copy it. Keep it secret.

## 2. Configure notification-service

Local (`notification-service/.env`):
```
TELEGRAM_BOT_TOKEN=7123456789:AAH...
TELEGRAM_BOT_USERNAME=RentBookAlertsBot
PUBLIC_URL=
```
Leave `PUBLIC_URL` empty locally: the bot **polls** Telegram for messages.

On Render, add the same two variables plus:
```
PUBLIC_URL=https://<your-notification-service>.onrender.com
```
With `PUBLIC_URL` set the bot switches to a **webhook**: Telegram pushes messages to the service, which also wakes a sleeping free-tier instance.

Restart the service. The log shows `[telegram] bot @RentBookAlertsBot ready`.

## 3. Link a user (each owner / tenant, one time)

1. Log in to RentBook → **Notifications** → **Connect Telegram**. A code appears, e.g. `/link 9F3A1C`.
2. Open the bot link, press **Start**, send `/link 9F3A1C`.
3. The bot replies "Linked as …" and the page shows **Connected**. Press **Send test alert** to confirm.

Bot commands: `/help`, `/status`, `/unlink`.

## 4. Daily reminders

`DIGEST_CRON` (default `30 3 * * *` = 09:00 IST) sends the owner summary and tenant reminders. `REMIND_DAYS_BEFORE` (default 2) controls how early tenants are warned.

Render free instances sleep when idle, so the scheduled job only fires if the service is awake. Two options:
- **Demo:** press **Send reminders now** on the owner's Notifications page (calls `POST /api/jobs/digest`).
- **Production:** a free pinger such as cron-job.org calling `POST https://<notification-service>/internal/jobs/digest` daily with header `x-service-key: <SERVICE_KEY>`.

## How it works (for the viva)

```
billing-service ──POST /internal/events──▶ notification-service ──▶ Telegram Bot API ──▶ phone
      ▲                                           │  ▲
      └────── GET /internal/digest ◀──────────────┘  └── GET /internal/users/:id (user-service)
```

- billing-service emits an event after a bill is issued/paid or a complaint changes. The call is fire-and-forget: if notification-service is down, the bill is still saved.
- notification-service stores every alert in its own database (in-app feed) and pushes to Telegram when the user has linked a chat.
- Linking: the app issues a 10-minute code; the user sends it to the bot; the service maps Telegram `chat_id` → RentBook user id.
- Two-way: tenant text → forwarded to owner; the forwarded message id is remembered so an owner's reply routes back to the right tenant.
