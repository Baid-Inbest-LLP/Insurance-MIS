# Insurance MIS

Internal Insurance MIS application — a MERN monorepo scaffold that shares the same foundation as Cash-Book, Mer-App and PO-Software: light/dark theme, navbar header, collapsible gradient sidebar, authentication, company management, and settings (user management). Insurance domain features (policies, claims, renewals, reports) can be built on top of this base.

## Stack

- **Client:** React 19 + Vite, Mantine, Tailwind CSS, React Query (server state), Redux Toolkit (UI state), React Router, React Hook Form
- **Server:** Express 5, Mongoose 8, Zod validation, JWT auth (access + refresh)
- **DB:** MongoDB via `MONGODB_URI`
- **Exports:** ExcelJS (`utils/excel.js`) and Puppeteer PDF (`utils/pdf.js`) branded report builders
- **Tooling:** pnpm workspace

## Project structure

```
Insurance-MIS/
├── client/                 # React app (Vite, port 5176)
│   └── src/
│       ├── api/            # axios instance + per-resource API modules
│       ├── components/     # common UI, layout (Navbar/Sidebar), effects, icons
│       ├── constants/      # routes, storage keys, roles
│       ├── hooks/          # React Query hooks (useAuth, useCompanies, useMasters)
│       ├── lib/            # queryClient, queryKeys, session helpers
│       ├── pages/          # auth, home, control-center, settings
│       ├── routes/         # ProtectedRoute
│       ├── store/          # Redux (theme, sidebar, filters)
│       └── utils/          # formatting, financial year, downloads
└── server/                 # Express API (port 5004)
    └── src/
        ├── config/         # env config + MongoDB connection
        ├── constants/      # roles, master slugs, transaction enums
        ├── controllers/    # request handlers
        ├── middleware/     # auth, validate (zod), upload, error handler
        ├── models/         # User, Company, Branch, LocationCity, Master, Department, Agent, Transaction (GI + LI)
        ├── routes/         # /api/v1/* routers
        ├── seed/           # first-boot superadmin bootstrap
        ├── services/       # business logic
        ├── utils/          # ApiError/ApiResponse, tokens, excel/pdf builders
        └── validators/     # zod schemas
```

## Getting started

```bash
cp server/.env.example server/.env   # then set MONGODB_URI
cp client/.env.example client/.env
pnpm install
pnpm dev          # runs client + server in parallel
```

- Client: http://localhost:5176
- API health: http://localhost:5004/api/v1/health

Ports are chosen so this app can run alongside the others (Cash-Book 5001/5173, Mer-App 5002/5174, PO-Software 5003/5175).

## Default account

A superadmin is created automatically on boot when none exists (override with `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`):

| Role       | Username   | Password |
| ---------- | ---------- | -------- |
| Superadmin | superadmin | super123 |

Users are created from **Settings** with one of these roles: `superadmin`, `admin`, `hod`, `emp-premium` or `emp-commission`. Only the superadmin can create and manage users. `hod`, `emp-premium` and `emp-commission` must be assigned one or more departments (departments are managed by the superadmin in **Control Center → Departments**). A department can have only one active `hod`.

## Included modules

| Area      | Notes                                                                |
| --------- | -------------------------------------------------------------------- |
| Auth      | Login, JWT access + refresh, role-based access                       |
| Layout    | Navbar header, collapsible gradient sidebar, light/dark theme toggle |
| Dashboard | Placeholder KPI tiles for policies, premium, claims, renewals        |
| Companies | CRUD for companies and branches (Control Center)             |
| Transactions | GI and LI insurance transactions: list/filter, create, update, soft delete (`/api/v1/transactions`) |
| Agents    | Agent list shared by all departments (Control Center, `/api/v1/masters/agents`); `/api/v1/masters/lookups` returns the dropdown data for entry forms |
| Settings  | User management (create/edit/deactivate/delete), change password     |

## Adding a module

1. **Server:** `models/X.js` → `validators/x.validator.js` → `services/x.service.js` → `controllers/x.controller.js` → `routes/x.routes.js`, then mount it in `routes/index.js`.
2. **Client:** `api/x.api.js` → `hooks/useX.js` (add keys to `lib/queryKeys.js`) → `pages/x/*`, then add the route in `App.jsx`, the path in `constants/index.js` and a nav item in `components/layout/Sidebar.jsx`.
