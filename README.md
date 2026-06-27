# TanviCRM — Customer CRM & Analytics Dashboard

A production-ready CRM for **Tanvi Boutique** (Fashion Boutique, Hyderabad) to track
customers, log purchases, auto-segment shoppers, and surface business insights through
an analytics dashboard.

> Aurora Institute of Technology · Industry Internship Programme · Batch 2025–26
> Project requirement **v1.0 — Final**.

---

## ✨ Features

**Customer database**
- Add / edit customers — name, phone, email, address, style preferences, notes
- Search by name, phone or email · sort by spend, activity, purchases
- Customer profile page with a full **purchase-history timeline** and category affinity

**Purchase tracking**
- Log purchases with multiple line items (item, category, qty, unit price)
- Amount is computed precisely from line items (source of truth)
- Edit / delete purchases; per-purchase **PDF receipt** (jsPDF)
- Global purchase log filterable by **category, payment method, date range and amount**

**Analytics dashboard**
- Revenue this **month** and **quarter** (with month-over-month delta)
- 12-month revenue trend, top customers by spend, most popular categories
- **Repeat customer rate** (2+ purchases) and **new vs returning** revenue split

**Segmentation**
- Auto-tagging: **VIP** (top 10 % by spend), **Regular** (2+ purchases), **New** (first
  purchase), **Inactive** (added, no purchases). Segments recompute on every purchase change.
- Filter the customer list by segment
- **Export the filtered list to CSV** (Excel-friendly, UTF-8 BOM)

**Access control & security**
- JWT auth with **role-based access control** (admin / staff)
- bcrypt password hashing · helmet · CORS allow-list · rate limiting (global + auth)
- **Every data route is behind authentication** — customer data is confidential

**Design**
- Editorial fashion-house aesthetic — Fraunces serif display + Inter body, aubergine &
  gold palette on warm paper
- Reusable component system, skeleton loaders, toasts, polished modals
- Fully **responsive** with a collapsible sidebar — built for tablet use at the counter

---

## 🧱 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React (Vite) · Tailwind CSS · React Router · Axios · Recharts · jsPDF |
| Backend   | Node.js · Express (ES modules) |
| Database  | **Supabase (PostgreSQL)** via `@supabase/supabase-js` |
| Auth      | JWT · bcrypt · RBAC |
| Security  | helmet · CORS · express-rate-limit · express-validator |
| Testing   | Jest · Supertest (runs against a live Supabase project) |

> **Note on the database:** this build runs on **Supabase (PostgreSQL)**. Analytics
> aggregations are implemented as Postgres RPC functions (see `backend/supabase/schema.sql`).
> All revenue/spend totals are rounded to 2 decimals for accuracy. The backend speaks
> camelCase to the frontend via a mapping layer, so the React app is unchanged.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js ≥ 18**
- A **Supabase** project (free tier is fine) — https://supabase.com

### 1. Install dependencies
```bash
# from the repo root
npm run install:all
# (or: cd backend && npm install   then   cd ../frontend && npm install)
```

### 1b. Create the database schema
In the Supabase dashboard → **SQL Editor → New query**, paste and run the contents of
[`backend/supabase/schema.sql`](backend/supabase/schema.sql). This creates the `users`,
`customers`, `purchases` tables, indexes, and the analytics RPC functions. (Safe to re-run.)

### 2. Configure environment
```bash
cp backend/.env.example backend/.env
# edit backend/.env:
#   SUPABASE_URL              = your project URL (Settings → API)
#   SUPABASE_SERVICE_ROLE_KEY = the service_role secret key (server-only!)
#   JWT_SECRET                = a long random string
```

### 3. Seed realistic demo data
```bash
npm run seed
# seeds 2 users, 35 customers and ~130 purchases across the last ~14 months
```

> **Migrating existing MongoDB data instead?** If you have data in a MongoDB Atlas
> cluster, set `MONGO_URI` in `.env` and run `npm run migrate:mongo` — it copies all
> users/customers/purchases into Supabase (preserving bcrypt password hashes and
> relationships) **without modifying MongoDB**.

### 4. Run it
```bash
# Terminal 1 — API on http://localhost:5000
npm run dev:backend

# Terminal 2 — App on http://localhost:5173  (proxies /api to the backend)
npm run dev:frontend
```

Open **http://localhost:5173**.

### 5. Production build
```bash
npm run build          # builds the frontend into frontend/dist
npm --prefix backend start   # serves the API
```

---

## 🔑 Demo Credentials

| Role  | Email                     | Password   | Can do |
|-------|---------------------------|------------|--------|
| Admin | `admin@tanviboutique.in`  | `Admin@123`| Everything + team management + delete customers |
| Staff | `staff@tanviboutique.in`  | `Staff@123`| Customers & purchases, analytics, CSV export |

---

## ✅ Testing

An automated API smoke test runs the **whole stack in-memory** (mongodb-memory-server),
seeds data, and asserts auth, RBAC, CRUD, segmentation and **analytics accuracy**:

```bash
npm test
```

Covers: token-gating, admin/staff RBAC, customer CRUD + search, segment promotion
(New → Regular), cascade delete, CSV export, and that dashboard revenue equals the exact
sum of purchase amounts. **21 tests, all passing.**

---

## 🗂️ Project Structure

```
tanvicrm/
├─ backend/
│  ├─ src/
│  │  ├─ config/        db connection, domain constants
│  │  ├─ models/        User, Customer, Purchase (Mongoose)
│  │  ├─ middleware/    auth (JWT), RBAC, validation, error handler
│  │  ├─ controllers/   auth, customers, purchases, analytics, users, meta
│  │  ├─ routes/        REST routes (all behind auth)
│  │  ├─ utils/         segmentation logic, seed data + runner, ApiError
│  │  ├─ app.js         express app (helmet, cors, rate-limit)
│  │  ├─ server.js      entry point
│  │  └─ seed.js        CLI seed script
│  └─ tests/            api.smoke.test.js
└─ frontend/
   └─ src/
      ├─ api/           axios client + typed endpoint helpers
      ├─ components/     ui/ primitives + layout + feature modals
      ├─ context/       AuthContext, ToastContext
      ├─ hooks/         useMeta
      ├─ lib/           formatting, CSV download, PDF receipt
      └─ pages/         Login, Dashboard, Customers, Profile, Purchases, Segments, Team, Account
```

---

## 📡 API Reference

All routes are prefixed with `/api`. All except `/auth/login` and `/health` require an
`Authorization: Bearer <token>` header. Responses are `{ success, data }` or
`{ success: false, error: { message, details? } }`.

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/auth/login` | public | Log in, returns `{ token, user }` |
| `GET`  | `/auth/me` | auth | Current user |
| `POST` | `/auth/change-password` | auth | Change own password |

### Customers
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/customers` | auth | List — `q, segment, sort, minSpend, maxSpend, purchaseFrom, purchaseTo, page, limit` |
| `GET`  | `/customers/export` | auth | CSV export of the filtered list |
| `GET`  | `/customers/:id` | auth | Profile + purchases + stats |
| `POST` | `/customers` | auth | Create |
| `PUT`  | `/customers/:id` | auth | Update |
| `DELETE` | `/customers/:id` | **admin** | Delete (cascades purchases) |

### Purchases
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET`  | `/purchases` | auth | List — `customer, category, paymentMethod, from, to, minAmount, maxAmount, page` |
| `POST` | `/purchases` | auth | Create (recomputes customer segment) |
| `PUT`  | `/purchases/:id` | auth | Update |
| `DELETE` | `/purchases/:id` | auth | Delete |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/summary` | Revenue (month/quarter/year), repeat rate, segment counts, VIP threshold |
| `GET` | `/analytics/top-customers` | Top customers by spend |
| `GET` | `/analytics/top-categories` | Revenue & units per category |
| `GET` | `/analytics/revenue-trend` | Monthly revenue series (`months`) |
| `GET` | `/analytics/new-vs-returning` | New vs returning revenue (`months`) |

### Users (admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | List team |
| `POST` | `/users` | Add member |
| `PUT` | `/users/:id` | Update (role / active / password) |
| `DELETE` | `/users/:id` | Remove (guards last admin) |

### Meta
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/meta` | Categories, payment methods, style prefs, segments |

---

## 📊 Business Logic Notes

- **VIP threshold** = spend of the customer at the top-10 % boundary among *paying*
  customers (≥ 1, ceil of 10 %). Recomputed whenever any purchase changes.
- **Segment precedence:** VIP → Regular (2+ purchases) → New (1 purchase) → Inactive (0).
- **Revenue accuracy:** purchase `amount` is always recomputed from line items server-side;
  analytics sum these amounts and round to 2 decimals.

---

## 🚫 Out of Scope (per spec)
E-commerce / online sales · product inventory management · WhatsApp/email marketing.

---

© 2025–26 Tanvi Boutique · Built for the Aurora Internship Programme. Confidential.
