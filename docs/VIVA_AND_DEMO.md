# Viva Questions and Demo Script

## Part A: Questions only (try answering first)

1. What is a microservice architecture? How is it different from a monolith?
2. What are the two microservices in RentBook, and why did you split it that way?
3. Why does each service have its own database?
4. How do your two services communicate? Give one concrete example.
5. Why can't billing-service use Mongoose `populate()` for tenant names?
6. How does billing-service know who the user is without a users table?
7. How do you stop a normal user from calling `/internal` APIs?
8. What happens if user-service is down while an owner opens the bills page?
9. What happens if user-service is down while an owner issues a bill? Why is it different?
10. Why is there a retry and a timeout on inter-service calls?
11. What are REST APIs? Which HTTP methods did you use for CRUD?
12. Explain the status codes 400, 401, 403, 404 and 409 with RentBook examples.
13. How did you prevent two bills for the same tenant in the same month?
14. What is a Mongoose virtual? Where did you use one?
15. How did you test the APIs?
16. How is each service deployed independently?
17. Why does the frontend need `VITE_USER_API_URL` and `VITE_BILLING_API_URL`?
18. What is CORS, and how did you handle it?
19. Why do the first requests on Render sometimes take ~50 seconds?
20. What would you add next?
21. What does notification-service do, and why is it a separate service?
22. How does a Telegram message reach the right user?
23. What happens to a bill if notification-service is down?
24. How does the owner reply to a tenant through the bot?
25. How do reminders run without anyone opening the app?

---

## Part B: Answers (definition → points → example)

**1. Microservices vs monolith**
- *Definition:* An application built as small, independent services, each owning one business capability and its data, talking over the network.
- *Points:* deployed independently; own database; communicate via APIs; one service failing need not stop the others. A monolith is one codebase, one deployment, one database.
- *Example:* RentBook was a single Express server; now user-service and billing-service run and deploy separately.

**2. The two services**
- *Definition:* user-service (auth, users, properties) and billing-service (bills, payments, complaints, dashboards).
- *Points:* split by data ownership; identity data changes rarely, billing data is transactional and grows every month.
- *Example:* changing the bill format only redeploys billing-service.

**3. Database per service**
- *Definition:* each service is the only one allowed to read/write its data.
- *Points:* loose coupling; schema changes stay local; services can scale separately.
- *Example:* `rentbook_users` and `rentbook_billing` are separate databases (`DB_NAME` env var).

**4. Communication**
- *Definition:* synchronous REST calls over HTTP using axios.
- *Points:* billing → user to validate tenants/properties and fetch names; user → billing before deleting a property.
- *Example:* issuing a bill calls `GET /internal/users/:id`; if the tenant doesn't exist, the bill is rejected with 404.

**5. No populate()**
- *Definition:* `populate()` joins collections inside one database.
- *Points:* users live in a different database owned by another service.
- *Example:* billing-service stores the tenant id and calls `POST /internal/users/batch` to get names for all bills in one request.

**6. Stateless auth**
- *Definition:* JWT, a signed token carrying `{ id, role }`.
- *Points:* user-service signs it; billing-service verifies it with the same `JWT_SECRET`; no lookup needed.
- *Example:* `billing-service/middleware/authMiddleware.js` decodes the token and sets `req.user`.

**7. Protecting internal APIs**
- *Definition:* a shared secret header, `x-service-key`.
- *Points:* `/internal/*` routes check it; missing or wrong key gives 403; the key never reaches the browser.
- *Example:* Postman request "Internal endpoint without service key → 403".

**8. Graceful degradation (reads)**
- *Definition:* keep working with reduced data when a dependency fails.
- *Points:* bills still load; names show "Name unavailable"; response header `x-degraded`; UI banner.
- *Example:* tested by stopping user-service.

**9. Fail-safe (writes)**
- *Definition:* refuse an action that can't be verified.
- *Points:* a bill for an unverified tenant would be bad data, so it returns 503 instead.
- *Example:* "user-service is unreachable right now…" message on the bill form.

**10. Timeout and retry**
- *Points:* timeout stops one slow service from hanging the other; one retry covers brief blips and cold starts; only safe (read) calls are retried.
- *Example:* `utils/serviceClient.js`, `SERVICE_TIMEOUT_MS`.

**11. REST and CRUD**
- *Definition:* resources identified by URLs, manipulated with HTTP methods, JSON bodies.
- *Points:* POST = create, GET = read, PUT = update, DELETE = delete.
- *Example:* `POST/GET/PUT/DELETE /api/properties/:id`.

**12. Status codes**
- 400 bad input (month not `YYYY-MM`), 401 no/expired token, 403 tenant trying to issue a bill, 404 bill id not found, 409 duplicate bill or property with unpaid bills.

**13. Duplicate bills**
- *Points:* unique compound index `{ tenant, month }` in MongoDB (the real guarantee) plus a friendly check before insert.
- *Example:* Postman "Issue duplicate bill → 409".

**14. Mongoose virtual**
- *Definition:* a computed field, not stored.
- *Example:* `total = rent + electricity + water + internet` on the Bill model, so it can never go out of sync.

**15. Testing**
- *Points:* Postman collection, 55 requests, 87 assertions; tokens and ids saved to variables automatically; error cases included; also runnable with Newman.

**16. Independent deployment**
- *Points:* two Render web services with different root directories, env vars and health checks; redeploying one does not touch the other.

**17. Frontend env vars**
- *Points:* the browser calls two different hosts; Vite bakes `VITE_*` values in at build time, so change them then redeploy.

**18. CORS**
- *Definition:* browser rule blocking calls to another origin unless the server allows it.
- *Points:* `cors()` middleware; `CLIENT_ORIGIN` restricts to the Vercel URL.

**19. Cold starts**
- *Points:* Render free services sleep after ~15 min idle; first request wakes them. The app warms both services on load, and the status page is opened before demos.

**20. Next steps**
- API gateway, message queue instead of direct event calls, payment gateway, Docker.

**21. notification-service**
- *Definition:* third microservice owning Telegram links, the notification feed and reminders (`rentbook_notifications` DB).
- *Points:* separate because delivery (Telegram today, email/SMS tomorrow) changes independently of billing; it can be down without affecting bills.
- *Example:* billing-service posts `complaint.created`; notification-service pushes it to the owner's phone.

**22. Routing to the right user**
- *Points:* the app issues a 10-minute code; the user sends `/link CODE` to the bot; the service stores Telegram `chat_id` → RentBook user id. Every alert looks up that mapping.

**23. notification-service down**
- *Points:* the event call is fire-and-forget with a timeout; the bill is saved and returned regardless; the alert is simply not delivered. Fail-safe for writes, best-effort for notifications.

**24. Owner reply**
- *Points:* when a tenant's text is forwarded, the service stores the forwarded message id with the tenant's chat id. The owner uses Telegram's Reply; the bot matches the replied-to id and sends the text to that tenant.

**25. Reminders**
- *Points:* node-cron inside notification-service runs a daily digest; it asks billing-service `GET /internal/digest` for overdue / due-soon bills and stale complaints, then messages owners and tenants. "Send reminders now" triggers the same job for demos.

---

## Part C: 5-minute demo script

**Two to three minutes before:** open `/status` on the deployed site and wait for four green checks.

| Time | Show | Rubric row |
|---|---|---|
| 0:00 | Architecture diagram in README: two services, two databases, REST between them | 5 (documentation) |
| 0:30 | `/status`: both services up, both directions reachable, live latency | 4 (deployment) |
| 1:00 | Log in as owner → dashboard. Say: occupancy comes from user-service, dues from billing-service | 2, 3 |
| 1:30 | Properties → add one, edit it (CRUD) | 1, 3 |
| 2:00 | Bills → issue a bill. Say: billing-service just asked user-service to verify the tenant and property | 1, 2 |
| 2:30 | Try the same tenant and month again → 409 message | 1, 2 |
| 2:45 | Properties → delete a property with an unpaid bill → blocked. Say: user-service asked billing-service | 2 |
| 3:15 | Log in as tenant → dashboard, pay the bill, raise a complaint | 3 |
| 3:45 | Back as owner → Maintenance → Start work | 3 |
| 4:00 | Postman → Run collection against deployed environment → all green | 5 |
| 4:30 | Render logs: same request id in both services for the bill you issued | 2 |

**Telegram demo (add 1 minute, biggest wow factor):** keep your phone visible. Log in as tenant → raise a complaint → the owner's phone buzzes. As owner → "Start work" → tenant's phone buzzes. Press **Send reminders now** → owner gets the unpaid summary. Type a message to the bot as tenant → it appears on the owner's phone; reply → it comes back.
