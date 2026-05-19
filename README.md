# Ensemblr

SvelteKit app for running mixture-of-agents generations across models from the live `models.dev` catalog.

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm
- Docker (for local PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
cp .env.example .env
```

### 2. Configure environment variables

Edit `.env`:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="a-long-random-secret-min-32-chars"
API_KEY_ENCRYPTION_SECRET="another-long-random-secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-admin-password"
ADMIN_NAME="Admin"
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="your-demo-password"
DEMO_NAME="Demo"
DEMO_ALLOWED_MODELS="openai/gpt-4o-mini,anthropic/claude-3-5-haiku-latest"
```

Generate strong secrets for production:

```bash
openssl rand -base64 32
```

### 3. Start the development database

```bash
docker run -d \
  --name postgres-sveltekit \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -v postgres-sveltekit-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 4. Apply database schema and seed accounts

```bash
pnpm db:migrate
pnpm db:seed
```

The seed script creates the admin and demo accounts from your `.env` values. It is idempotent — safe to run multiple times.

### 5. Start the development server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Development commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the Vite dev server |
| `pnpm check` | Run Svelte type checking |
| `pnpm lint` | Run Prettier and ESLint |
| `pnpm build` | Build for production |
| `pnpm db:generate` | Generate a new Drizzle migration |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:seed` | Run the idempotent seed script |
| `pnpm db:studio` | Open Drizzle Studio |

---

## Production Deployment (Coolify)

This project is built with SvelteKit and the Node adapter (`@sveltejs/adapter-node`), so it deploys as a standard Node.js application.

### 1. Create a PostgreSQL database

In Coolify, create a **PostgreSQL** resource for the app. Note the connection string (host, port, user, password, database name). You will need it for `DATABASE_URL`.

### 2. Create a new resource from your Git repository

Add a new resource in Coolify and point it to this repository.

### 3. Configure the build and start commands

In the Coolify resource settings, set:

| Setting | Value |
|---------|-------|
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `node build/index.js` |

If you prefer to run migrations automatically on every deploy, use:

| Setting | Value |
|---------|-------|
| **Build Command** | `pnpm install && pnpm build && pnpm db:migrate && pnpm db:seed` |
| **Start Command** | `node build/index.js` |

### 4. Configure environment variables

Add the following environment variables in Coolify (or import them from a file):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/db` |
| `ORIGIN` | **Yes** | The public URL of your app, e.g. `https://ensemblr.yourdomain.com` |
| `BETTER_AUTH_SECRET` | **Yes** | High-entropy secret for auth session signing. Generate with `openssl rand -base64 32` |
| `API_KEY_ENCRYPTION_SECRET` | **Yes** | High-entropy secret for encrypting stored provider API keys. Generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL` | **Yes** | Email address for the initial admin account |
| `ADMIN_PASSWORD` | **Yes** | Password for the initial admin account |
| `ADMIN_NAME` | No | Display name for the admin account (default: `Admin`) |
| `DEMO_EMAIL` | **Yes** | Email address for the initial demo account |
| `DEMO_PASSWORD` | **Yes** | Password for the initial demo account |
| `DEMO_NAME` | No | Display name for the demo account (default: `Demo`) |
| `DEMO_ALLOWED_MODELS` | No | Comma-separated list of `provider/model` IDs allowed for demo users, e.g. `openai/gpt-4o-mini,anthropic/claude-3-5-haiku-latest` |

### 5. Deploy

Click **Deploy** in Coolify. The build process will:

1. Install dependencies
2. Build the SvelteKit app into `build/`
3. Run migrations (if included in the build command)
4. Run the seed script (if included in the build command)
5. Start the Node server

### 6. First login

After the first successful deploy, sign in at `/login` with the `ADMIN_EMAIL` and `ADMIN_PASSWORD` you configured.

### 7. Post-deployment database updates

If you add new Drizzle migrations in the future, you must run them against the production database. You can do this via Coolify's **Execute Command** feature:

```bash
pnpm db:migrate
```

Or by temporarily updating the **Build Command** to include `pnpm db:migrate` and redeploying.

---

## App Overview

- **Login**: `/login` — supports email/password authentication via Better Auth
- **Workspace**: `/` — create and run mixture-of-agents generations
- **History**: `/history` — view past generation runs
- **Settings**: `/settings` — manage provider API keys (encrypted at rest)
- **Admin**: `/admin` — configure prompt templates and demo model access (admin only)

Model and provider options are fetched live from `https://models.dev/api.json`. Providers are visible in the UI for all users, but inference is enabled only for installed AI SDK provider factories and OpenAI-compatible providers with a usable API base URL.
