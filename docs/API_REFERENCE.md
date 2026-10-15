# RentBook API Reference

All bodies are JSON. Protected endpoints need `Authorization: Bearer <token>` (token from register/login).
Errors always look like `{ "message": "…", "code": "…optional…" }`.

| Status | Meaning in RentBook |
|---|---|
| 200 / 201 | OK / created |
| 400 | Validation failed (missing field, bad id, bad month format, invalid status) |
| 401 | No token, or token invalid/expired |
| 403 | Wrong role, someone else's record, or missing/wrong `x-service-key` on `/internal` |
| 404 | Record not found |
| 409 | Conflict: duplicate email, duplicate bill for the month, paid bill edit/delete, property with unpaid bills |
| 502 | The other microservice rejected or failed the request |
| 503 | The other microservice is unreachable |

Base URLs: user-service `http://localhost:5001` · billing-service `http://localhost:5002` (or the Render URLs).

---

## user-service

### POST /api/auth/register
```json
{ "name": "Ravi Kumar", "email": "owner@rentbook.in", "password": "123456", "role": "owner" }
```
`role` may be `tenant` (default) or `owner`; anything else becomes `tenant`.
**201** `{ "token": "eyJ…", "user": { "_id": "…", "name": "Ravi Kumar", "email": "owner@rentbook.in", "role": "owner" } }`
Errors: 400 missing fields / invalid email / password < 6 chars, 409 email exists.

### POST /api/auth/login
`{ "email": "owner@rentbook.in", "password": "123456" }` → **200** same shape as register. 401 on wrong credentials.

### GET /api/auth/me  (any user)
**200** the user without the password.

### GET /api/users/tenants  (owner)
**200** `[ { "_id": "…", "name": "Nila Sundar", "email": "tenant@rentbook.in" } ]`

### Properties (owner only)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/properties` | — | 200 array of the owner's properties |
| POST | `/api/properties` | `{ "name", "address", "rooms", "occupied"?, "monthlyRent" }` | 201 property |
| GET | `/api/properties/:id` | — | 200 property |
| PUT | `/api/properties/:id` | any of `name, address, rooms, occupied, monthlyRent` | 200 property (other fields ignored, `owner` cannot change) |
| DELETE | `/api/properties/:id` | — | 200 `{ "message": "Property removed.", "checkedWith": "billing-service", "billsOnRecord": 2 }` |

Validation: `rooms ≥ 1`, `0 ≤ occupied ≤ rooms`, `monthlyRent ≥ 0`.
DELETE first calls billing-service `GET /internal/bills/summary`; **409** if unpaid bills exist, **503** if billing-service is unreachable.

### Internal (header `x-service-key` required, called by billing-service)
| Method | Path | Response |
|---|---|---|
| GET | `/internal/users/:id` | `{ _id, name, email, role }` or 404 |
| POST | `/internal/users/batch` `{ "ids": [...] }` | array of users |
| GET | `/internal/properties?owner=<id>` | array of properties |
| GET | `/internal/properties/:id` | property or 404 |
| POST | `/internal/properties/batch` `{ "ids": [...] }` | array of `{ _id, name, address, owner }` |

### Health
`GET /api/health` → `{ "service": "user-service", "status": "ok", "database": "connected", … }`
`GET /api/health/dependencies` → `{ "dependency": "billing-service", "reachable": true, "latencyMs": 14, … }` (503 when unreachable)

---

## billing-service

### Bills
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/bills?status=pending\|paid` | tenant / owner | Tenant: own bills. Owner: bills they issued. Newest month first. Tenant and property objects attached from user-service. |
| GET | `/api/bills/:id` | tenant / owner | Own bill only |
| POST | `/api/bills` | owner | See below |
| PUT | `/api/bills/:id` | owner | Pending only. Editable: `rent, electricity, water, internet, dueDate, room` |
| DELETE | `/api/bills/:id` | owner | Pending only (409 for paid bills: they are payment records) |
| POST | `/api/bills/:id/pay` | tenant | Sets `status: "paid"`, `paidOn`. 400 if already paid |

**POST /api/bills**
```json
{
  "tenant": "<tenantId>", "property": "<propertyId>", "room": "204",
  "month": "2026-10", "dueDate": "2026-10-10",
  "rent": 6500, "electricity": 640, "water": 250, "internet": 500
}
```
Flow: validate fields → **user-service** `GET /internal/users/:tenant` (404 unknown, 400 not a tenant) → **user-service** `GET /internal/properties/:property` (404 unknown, 403 not yours) → duplicate check (409) → save.
**201**
```json
{
  "_id": "…", "month": "2026-10", "rent": 6500, "electricity": 640, "water": 250, "internet": 500,
  "total": 7890, "status": "pending", "dueDate": "2026-10-10T00:00:00.000Z", "room": "204",
  "tenant": { "_id": "…", "name": "Nila Sundar", "email": "tenant@rentbook.in" },
  "property": { "_id": "…", "name": "Sunrise Residency", "address": "Peelamedu, Coimbatore" },
  "owner": "…"
}
```
`total` is a Mongoose virtual (computed, not stored). `month` must be `YYYY-MM`. One bill per tenant per month (unique index).

### Complaints
| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/api/complaints?status=…` | tenant / owner | Own complaints; tenant/property names from user-service |
| POST | `/api/complaints` | tenant | `{ "title", "description", "priority"?: "low\|medium\|high", "room"? }`. Routed to the owner of the tenant's latest bill; 409 if the tenant has no bill yet |
| PUT | `/api/complaints/:id` | owner | `{ "status": "pending\|in-progress\|resolved" }` |
| DELETE | `/api/complaints/:id` | tenant | Only while `pending` (409 otherwise) |

### Dashboards
**GET /api/tenant/summary** (tenant)
```json
{ "property": "Sunrise Residency", "room": "204", "amountDue": 7930, "dueDate": "…",
  "totalOutstanding": 7930, "unpaidBills": 1, "totalPaid": 15830, "openComplaints": 2,
  "currentBill": { … }, "degraded": false }
```
**GET /api/owner/stats** (owner): property figures from user-service + billing figures from billing-service.
```json
{ "properties": 2, "rooms": 32, "occupied": 24, "vacant": 8, "monthlyIncome": 137800,
  "pendingPayments": 2, "pendingAmount": 14400, "collectedThisMonth": 0, "openComplaints": 3,
  "collections": [ { "key": "2026-05", "month": "May", "amount": 0 }, … ],
  "degraded": false,
  "sources": { "properties": "user-service", "bills": "billing-service", "complaints": "billing-service" } }
```
If user-service is down: property fields are `null`, `degraded: true`, billing figures still returned.

### Internal (header `x-service-key`, called by user-service)
`GET /internal/bills/summary?property=<id>` → `{ "property": "…", "totalBills": 3, "pendingBills": 1 }`

### Health
`GET /api/health`, `GET /api/health/dependencies` (reachability of user-service).

### Response headers (both services)
`x-request-id` (same id appears in both services' logs for one action), `x-served-by`, and on billing-service `x-degraded: user-service` when names had to be replaced by placeholders.

---

## notification-service

Base URL: `http://localhost:5003` (or the Render URL).

### Notifications (JWT)
| Method | Path | Response |
|---|---|---|
| GET | `/api/notifications?unread=1&limit=30` | `{ items: [ { _id, type, title, message, link, read, channel, telegramStatus, createdAt } ], unread }` |
| PUT | `/api/notifications/read-all` | `{ updated }` |
| PUT | `/api/notifications/:id/read` | the notification |

Types: `bill.issued`, `bill.paid`, `complaint.created`, `complaint.updated`, `complaint.withdrawn`, `reminder.due`, `reminder.overdue`, `digest.owner`, `message.tenant`, `message.reply`, `test`.

### Telegram (JWT)
| Method | Path | Response |
|---|---|---|
| GET | `/api/telegram/status` | `{ enabled, botUsername, botLink, linked, telegramName, linkedAt }` |
| POST | `/api/telegram/link-code` | 201 `{ code, command: "/link ABC123", expiresAt, botLink }` |
| DELETE | `/api/telegram/link` | `{ unlinked }` |
| POST | `/api/telegram/test` | `{ delivered, telegramStatus }` |

### Jobs
| Method | Path | Access | Response |
|---|---|---|---|
| POST | `/api/jobs/digest` | owner | `{ owners, tenants, notifications }` (runs the daily reminder job now) |
| POST | `/internal/jobs/digest` | service key | same, for an external cron pinger |

### Internal (service key)
| Method | Path | Body | Purpose |
|---|---|---|---|
| POST | `/internal/events` | `{ type, tenant: {_id,name}, owner: {_id}, bill?, complaint?, property? }` | Called by billing-service after a business event |
| POST | `/internal/telegram/simulate` | `{ chatId, text, from?, replyToMessageId? }` | Feed a fake Telegram message (testing / console mode) |

### Telegram webhook
`POST /telegram/webhook/:secret` is called by Telegram's servers when `PUBLIC_URL` is set. The secret is derived from the bot token, so unrelated posts are rejected with 403.

### Added to billing-service for notifications
| Method | Path | Purpose |
|---|---|---|
| GET | `/internal/tenants/:id/owner` | Which owner a tenant belongs to (whoever billed them last) |
| GET | `/internal/digest?remindDays=2` | Per-owner and per-tenant lists of overdue / due-soon bills and repairs waiting 3+ days |
