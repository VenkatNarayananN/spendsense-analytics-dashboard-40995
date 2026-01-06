
**SpendSense Analytics Dashboard (Monorepo)
SpendSense is a modern analytics dashboard for personal finance and spending insights. This repository is organized as a small monorepo containing a React frontend dashboard, an Express backend API, and a PostgreSQL/Supabase-compatible migration set for the database layer.
The system is designed to work well in local development and in the Kavia preview environment, where each container is exposed on its own port.

Project overview
The frontend provides an elegant analytics experience with pages for Dashboard, Transactions, Insights, Alerts, and Settings. Authentication and realtime updates are built on Supabase (Auth + Realtime). The backend exposes a small REST API and includes an FX rates endpoint backed by Open Exchange Rates, including a 1-hour in-memory cache. The database folder contains SQL migrations and seed data compatible with PostgreSQL and Supabase.

Repository structure
The monorepo is organized by container workspace folders. The “database” workspace contains migrations and helper scripts.

text

.
├── .github/
│   └── workflows/
│       └── ci.yml                         # GitHub Actions CI (frontend + backend + migration verification)
├── spendsense-analytics-dashboard-40994/
│   ├── README.md                          # Workspace stub README
│   └── backend/                           # Express API (port 3001 in Kavia)
│       ├── package.json                   # Backend scripts and dependencies (nodemon, jest, eslint)
│       ├── swagger.js                     # Swagger/OpenAPI generation wiring
│       ├── interfaces/
│       │   └── openapi.json               # OpenAPI artifact (do not edit manually)
│       └── src/
│           ├── app.js                     # Express app setup (CORS, routes, /docs)
│           ├── server.js                  # Server entrypoint
│           ├── routes/
│           │   └── index.js               # Route definitions (/, /api/fx/latest)
│           ├── controllers/               # Request handlers
│           └── services/
│               ├── fx.js                  # Open Exchange Rates integration + caching
│               └── health.js              # Health service
├── spendsense-analytics-dashboard-40995/
│   ├── README.md                          # Workspace stub README
│   └── frontend_dashboard_ui/             # React app (port 3000 in Kavia)
│       ├── package.json                   # CRA scripts (start/test/build)
│       ├── public/                        # Static assets
│       └── src/
│           ├── App.js                     # App root (routes + layout)
│           ├── layout/                    # App shell / navigation layout
│           ├── pages/                     # Dashboard, Transactions, Insights, Alerts, Settings, etc.
│           ├── routes/                    # ProtectedRoute logic
│           ├── config/
│           │   ├── env.js                 # Reads REACT_APP_BACKEND_URL / REACT_APP_API_BASE
│           │   └── supabaseClient.js      # Supabase client configuration
│           └── services/
│               ├── fxRates.js             # Calls backend FX endpoint + client-side caching
│               └── transactionsRealtime.js# Realtime transaction inserts via Supabase
└── spendsense-analytics-dashboard-40996/
    ├── README.md                          # Workspace stub README
    └── database/                          # PostgreSQL container (port 5001 in Kavia)
        ├── db_connection.txt              # psql connection string for this environment
        ├── startup.sh                     # DB startup helper
        ├── backup_db.sh                   # Backup helper
        ├── restore_db.sh                  # Restore helper
        ├── migrations/
        │   ├── 001_init.sql               # Schema + constraints + triggers (+ commented Supabase RLS examples)
        │   ├── 002_seed.sql               # Seed/demo data
        │   ├── 001_down.sql               # Drop schema objects (rollback)
        │   └── README.md                  # Migration usage notes
        └── db_visualizer/                 # Optional DB visualizer tooling
Setup instructions
This repo is split into three “containers” (frontend, backend, database). You can run them independently, but typical development runs all three.

Prerequisites
You will need the following installed locally:

Node.js 18+
npm (or an npm-compatible package manager)
PostgreSQL client tools (psql) for applying migrations locally or against Supabase
Frontend setup (React dashboard)
Working directory:

bash

cd spendsense-analytics-dashboard-40995/frontend_dashboard_ui
Install dependencies:

bash

npm install
Create your environment file:

Create a .env file in spendsense-analytics-dashboard-40995/frontend_dashboard_ui/ (see “Environment variables” below).
Do not commit .env files.
Start the dev server:
bash

npm start
The frontend expects a backend base URL (see src/config/env.js). If the backend URL is missing, the FX features will show an error such as “Backend URL is not configured”.

Backend setup (Express API)
Working directory:

bash

cd spendsense-analytics-dashboard-40994/backend
Install dependencies:

bash

npm install
Create your environment file:

Create a .env file in spendsense-analytics-dashboard-40994/backend/.
The backend requires OPEN_EXCHANGE_RATES_API_KEY to serve FX requests.
Run in dev mode:
bash

npm run dev
The backend exposes:

GET / for health checks
GET /api/fx/latest?base=USD|EUR|GBP|INR for latest FX rates (with a 1-hour in-memory cache per base currency)
GET /docs for Swagger UI
Database setup (PostgreSQL / Supabase migrations)
Working directory:

bash

cd spendsense-analytics-dashboard-40996/database
This workspace includes a preconfigured connection string file for the current environment:

bash

cat db_connection.txt
To apply migrations:

bash

psql "$(cat db_connection.txt)" -v ON_ERROR_STOP=1 -f migrations/001_init.sql
psql "$(cat db_connection.txt)" -v ON_ERROR_STOP=1 -f migrations/002_seed.sql
To rollback (drops tables; use with care):

bash

psql "$(cat db_connection.txt)" -v ON_ERROR_STOP=1 -f migrations/001_down.sql
For more detail, see spendsense-analytics-dashboard-40996/database/migrations/README.md.

Environment variables
This monorepo uses environment variables across containers. In local development, create a .env file inside each container directory (frontend .env is read by Create React App; backend .env is read via dotenv).

Frontend environment variables (React / CRA)
Create: spendsense-analytics-dashboard-40995/frontend_dashboard_ui/.env
Required for Supabase Auth + Realtime:

REACT_APP_SUPABASE_URL
The Supabase project URL, for example https://xxxx.supabase.co.
REACT_APP_SUPABASE_KEY
The anon public key used by the browser client.
Required for calling the backend API:
REACT_APP_BACKEND_URL
Preferred base URL for the backend, used by the FX service.
REACT_APP_API_BASE
Fallback base URL if REACT_APP_BACKEND_URL is not provided.
Notes:
The frontend resolves the backend URL via getBackendUrl() in src/config/env.js, which prefers REACT_APP_BACKEND_URL and falls back to REACT_APP_API_BASE.
Do not put server-side secrets into frontend .env files. Any REACT_APP_* variable is bundled into the browser build.
Backend environment variables (Express)
Create: spendsense-analytics-dashboard-40994/backend/.env
Required:

OPEN_EXCHANGE_RATES_API_KEY
Server-side API key used by /api/fx/latest. If missing, the backend throws an error and the endpoint will fail.
Common optional variables:
PORT
Server port. In Kavia, the backend runs on port 3001 by convention.
HOST
Bind address (defaults to 0.0.0.0 in src/server.js).
Database environment variables (PostgreSQL container)
In Kavia, the database container is configured with environment variables (and a connection string file). The work item lists common DB vars such as:

POSTGRES_URL
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_PORT
For this environment, spendsense-analytics-dashboard-40996/database/db_connection.txt provides a psql postgresql://... connection string that can be used directly for migration application.
Common scripts
Scripts are container-specific. Run them from within each container directory.

Frontend scripts
From spendsense-analytics-dashboard-40995/frontend_dashboard_ui/:

npm start
Runs the React dev server.
npm test
Runs tests (CRA test runner). In CI it is executed with CI=true and --watchAll=false.
npm run build
Produces a production build in build/.
npm run eject
CRA eject (typically not recommended).
Backend scripts
From spendsense-analytics-dashboard-40994/backend/:

npm run dev
Runs nodemon for live-reloading during development.
npm start
Runs node src/server.js.
npm test
Runs Jest tests.
npm run lint
Runs ESLint across the backend workspace.
Database scripts
From spendsense-analytics-dashboard-40996/database/:
This folder includes helper scripts such as:

startup.sh
Starts the database container runtime for the environment.
backup_db.sh and restore_db.sh
Backup and restore helpers.
Migrations are applied with psql using the connection string in db_connection.txt.
Kavia preview / start guidance
Kavia typically exposes each container on its assigned port. In this project:

Frontend (React): port 3000
Backend (Express): port 3001 (Swagger UI at /docs)
Database (PostgreSQL): port 5001
In a Kavia session, you generally:
Ensure the database container is running and migrations are applied.
Start the backend and confirm /docs loads and GET / returns 200.
Start the frontend and validate it can reach the backend base URL and Supabase configuration.
This README intentionally documents how to run each container, but does not attempt to start any processes automatically.
Secrets management: .env vs .env.example
This repository should treat environment files as secrets:

Use .env files for local development and Kavia runtime configuration.
Do not commit .env files.
Prefer committing a .env.example file per container in the future to document required variables without including secrets.
Important: any variable prefixed with REACT_APP_ is embedded into the frontend bundle and is therefore public at runtime. Only put non-secret values (and public Supabase anon keys) in frontend .env.
CI workflow summary
The GitHub Actions workflow is defined in:

.github/workflows/ci.yml
It runs three jobs:
Frontend job: installs dependencies, runs lint if present, runs tests (with coverage), and builds the React app.
Backend job: installs dependencies, runs lint if present, runs tests, and validates runtime entry (or build if present).
Database job: performs a lightweight verification that the migrations directory and README exist.
CI uses Node.js 18 and caches npm dependencies per workspace.
Releases
For a concise, repeatable process to ship changes across the frontend, backend, and database migrations (including pre-release checks, SemVer/tagging guidance, post-release validation, and rollback basics), see:

kavia-docs/RELEASE.md
Contribution workflow (branches / PRs)
A typical workflow for contributions:

Create a feature branch from main (or master if that is the primary branch).
Make changes in the relevant container directory.
Run lint/tests locally for the impacted container(s).
Open a Pull Request and ensure GitHub Actions CI passes.
Prefer small, focused PRs with clear descriptions.
Roadmap / TODO (placeholders)
Add .env.example files for frontend and backend and document safe defaults.
Expand backend OpenAPI specification to include the FX endpoint in the generated OpenAPI artifact.
Add integration tests that cover frontend-to-backend FX flows.
Add Supabase policy documentation and optionally enable RLS with curated policies for production deployments.
Add a root-level script/tooling for running all containers together (optional).
Task completed: Professional root README created with repo structure overview, setup instructions, env var documentation, scripts, Kavia preview guidance, CI summary, contribution workflow, and roadmap placeholders.
