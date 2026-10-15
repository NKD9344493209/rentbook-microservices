# RentBook client (v2 UI)

React 19 + Vite + Tailwind CSS 4. Talks to two microservices:
user-service (auth, users, properties) and billing-service (bills, complaints, dashboards).

## Run locally
    npm install
    npm run dev          # http://localhost:3000

The Vite dev server proxies /user-api -> localhost:5001 and /billing-api -> localhost:5002.

## Deploy (Vercel)
Root directory: client. Build: npm run build. Output: dist.
Env vars: VITE_USER_API_URL and VITE_BILLING_API_URL, each ending in /api.

## Structure
    src/api/client.js      one axios client per microservice
    src/components/        Layout (sidebar + header), ui.jsx, charts.jsx, Icons.jsx
    src/pages/             Owner: OwnerDashboard, OwnerProperties, OwnerBills, OwnerComplaints
                           Tenant: TenantDashboard, Bills, Complaints
                           Shared: Login, Register, ServiceStatus
    src/hooks/useApi.js    loading / error / retry for every page
    src/utils/format.js    rupees, dates, month keys
