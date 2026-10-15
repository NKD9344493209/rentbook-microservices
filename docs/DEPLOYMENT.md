# Deployment Guide — Atlas + Render (×2) + Vercel

Budget about 30–40 minutes. Do the steps in order; step 5 fills in URLs that only exist after steps 3–4.

## 0. Prepare two secrets

Generate two long random strings (run twice):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
- `JWT_SECRET`: the same value in **both** services.
- `SERVICE_KEY`: the same value in **both** services (protects `/internal` routes).

## 1. MongoDB Atlas

1. Use your existing cluster. Both services can share it; `DB_NAME` keeps the data in two separate databases (`rentbook_users`, `rentbook_billing`).
2. **Network Access → Add IP Address → `0.0.0.0/0`** (Render's outbound IPs change).
3. Copy the connection string. If Render logs show `querySrv ENOTFOUND` / SRV errors, use the **standard (non-SRV)** connection string from Atlas instead of `mongodb+srv://`.

## 2. Push to GitHub

```bash
git add .
git commit -m "Split RentBook into user-service and billing-service"
git push
```
Confirm `.env` files are **not** in the repo (they are in `.gitignore`).

## 3. Deploy user-service on Render

Render → **New → Web Service** → connect the repo.

| Setting | Value |
|---|---|
| Name | `rentbook-user-service` |
| Root Directory | `user-service` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance | Free |
| Health Check Path | `/api/health` |

Environment variables:

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas URI |
| `DB_NAME` | `rentbook_users` |
| `JWT_SECRET` | secret from step 0 |
| `SERVICE_KEY` | secret from step 0 |
| `BILLING_SERVICE_URL` | leave for now (step 5) |

Deploy, then open `https://<user-service>.onrender.com/api/health` → `"status":"ok"`.

## 4. Deploy billing-service on Render

Same as step 3 with:

| Setting | Value |
|---|---|
| Name | `rentbook-billing-service` |
| Root Directory | `billing-service` |

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas URI |
| `DB_NAME` | `rentbook_billing` |
| `JWT_SECRET` | **same** as user-service |
| `SERVICE_KEY` | **same** as user-service |
| `USER_SERVICE_URL` | `https://<user-service>.onrender.com` (no trailing slash, no `/api`) |

Check `https://<billing-service>.onrender.com/api/health/dependencies` → `"reachable": true`.

(Alternative to steps 3–4: Render → New → **Blueprint** uses `render.yaml` to create both services; you still fill the secret values.)

## 4b. Deploy notification-service on Render

Same as step 3 with Root Directory `notification-service`, name `rentbook-notification-service`.

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas URI |
| `DB_NAME` | `rentbook_notifications` |
| `JWT_SECRET` | **same** as the others |
| `SERVICE_KEY` | **same** as the others |
| `USER_SERVICE_URL` | `https://<user-service>.onrender.com` |
| `BILLING_SERVICE_URL` | `https://<billing-service>.onrender.com` |
| `TELEGRAM_BOT_TOKEN` | from @BotFather (see docs/TELEGRAM_SETUP.md); leave empty for in-app-only alerts |
| `TELEGRAM_BOT_USERNAME` | e.g. `RentBookAlertsBot` |
| `PUBLIC_URL` | `https://<notification-service>.onrender.com` (this service's own URL, set after first deploy) |

Then on **billing-service** add `NOTIFICATION_SERVICE_URL = https://<notification-service>.onrender.com`.

## 5. Connect user-service back to billing-service

user-service → Environment → add `BILLING_SERVICE_URL = https://<billing-service>.onrender.com` → Save (Render redeploys).
Check `https://<user-service>.onrender.com/api/health/dependencies` → `"reachable": true`.

## 6. Deploy the frontend on Vercel

Vercel → **Add New → Project** → import the repo.

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Environment variables (note the `/api` at the end):

| Key | Value |
|---|---|
| `VITE_USER_API_URL` | `https://<user-service>.onrender.com/api` |
| `VITE_BILLING_API_URL` | `https://<billing-service>.onrender.com/api` |
| `VITE_NOTIFY_API_URL` | `https://<notification-service>.onrender.com/api` |

Do **not** mark them "Sensitive": Vite needs them at build time. `vercel.json` already makes page refreshes work on routes like `/owner/bills`.

## 7. Optional: lock CORS to your frontend

On all three Render services set `CLIENT_ORIGIN = https://<your-app>.vercel.app` (comma-separate several origins). Empty means all origins are allowed.

## 8. Verify and seed

1. Open `https://<your-app>.vercel.app/status` → six green checks.
2. Seed demo data against the live services:
   ```bash
   node scripts/seed-demo.mjs https://<user-service>.onrender.com https://<billing-service>.onrender.com
   ```
3. In Postman, import `docs/postman/RentBook-Deployed.postman_environment.json`, fill the two URLs and `serviceKey`, and run the collection. Export the run results as evidence.
4. Fill the links table at the top of `README.md`.

## Before the demo (Render free tier sleeps after ~15 min idle)

Open the `/status` page **2–3 minutes before** your turn and wait for all checks to go green. The first request to a sleeping service takes up to ~50 s; the app's timeouts already allow for it.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Render log: `DB connection failed` | Wrong `MONGO_URI`, Atlas IP list missing `0.0.0.0/0`, or SRV DNS issue (use the non-SRV string) |
| Login works but bills page says *Not authorised. Token is invalid* | `JWT_SECRET` differs between the two services |
| *user-service rejected the request: Internal endpoint. Service key missing or wrong.* | `SERVICE_KEY` differs between the services |
| *… URL is not configured (USER_SERVICE_URL)* | Env var missing on that service; add it and let Render redeploy |
| Frontend calls `localhost` or `/user-api` in production | `VITE_*` vars missing at build time; add them and **Redeploy** on Vercel |
| CORS error in the browser console | `CLIENT_ORIGIN` doesn't exactly match the Vercel URL (scheme included, no trailing slash) |
| 404 when refreshing a page on Vercel | `client/vercel.json` missing from the deployed root |
