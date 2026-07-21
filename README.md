# Ensemblr

SvelteKit app for running mixture-of-agents generations across models from the live `models.dev` catalog.

---

## Development Setup

### Prerequisites

- Node.js 22.12+
- pnpm
- Podman (for local PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
cp .env.example .env
```

### 2. Configure environment variables

Edit `.env` using the variables documented under [Production environment variables](#4-configure-environment-variables). For local development, set `ORIGIN` to `http://localhost:5173` and use the callback URL `http://localhost:5173/api/auth/oauth2/callback/oidc` in the OIDC client.

Generate strong secrets for production:

```bash
openssl rand -base64 32
```

### 3. Start the development database

```bash
podman run -d \
  --name postgres-sveltekit \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -v postgres-sveltekit-data:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 4. Apply database schema and seed demo data

```bash
pnpm db:migrate
pnpm db:seed
```

The seed script ensures the credential-free demo account exists and creates initial app settings if they do not exist yet. It is idempotent — safe to run multiple times. Existing prompt templates and admin-selected demo models are preserved on later seed runs. An administrator account is created by the first admitted OIDC login; on an upgraded installation, that identity is attached to the sole existing admin row so its keys and history remain available.

### 5. Start the development server

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

### Development commands

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start the Vite dev server        |
| `pnpm check`       | Run Svelte type checking         |
| `pnpm lint`        | Run Prettier and ESLint          |
| `pnpm build`       | Build for production             |
| `pnpm db:generate` | Generate a new Drizzle migration |
| `pnpm db:migrate`  | Run pending migrations           |
| `pnpm db:seed`     | Run the idempotent seed script   |
| `pnpm db:studio`   | Open Drizzle Studio              |

---

## Authentication Setup

Administrator access uses Better Auth's server-side OpenID Connect Authorization Code flow with PKCE S256. The provider's access policy is the sole administrator admission control; Ensemblr then creates an HttpOnly local session with a 24-hour sliding idle timeout, refreshed only by trusted browser interaction, and a fixed seven-day lifetime. The separate demo button remains credential-free and does not authenticate with the provider.

- **Public Client:** Off
- **Grant:** Authorization Code with PKCE S256
- **Token endpoint authentication:** `client_secret_post`
- **Scopes:** `openid profile email` (do not grant `offline_access`)
- **Callback path:** `/api/auth/oauth2/callback/oidc`
- **Application logout path:** `/logout` (POST)
- **Allowed post-logout redirect path:** `/login`

Configure all authentication environment variables in [Production environment variables](#4-configure-environment-variables). The provider must publish an `end_session_endpoint` in its discovery document for RP-Initiated Logout. Apply the provider's access policy to this client; do not configure an application identity or claim allowlist.

---

## Production Deployment (Coolify)

This project is built with SvelteKit and the Node adapter (`@sveltejs/adapter-node`), so it deploys as a standard Node.js application.

The repository includes `nixpacks.toml` to pin a nixpkgs archive with Node.js 22.12+ support. This is required because Nixpacks only selects Node by major version, and the default Node 22 archive may be too old for the Svelte/Vite toolchain.

### 1. Create a PostgreSQL database

In Coolify, create a **PostgreSQL** resource for the app. Note the connection string (host, port, user, password, database name). You will need it for `DATABASE_URL`.

### 2. Create a new resource from your Git repository

Add a new resource in Coolify and point it to this repository.

### 3. Configure the build and start commands

In the Coolify resource settings, set:

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| **Build Command** | `pnpm install && pnpm build` |
| **Start Command** | `node build/index.js`        |

If you prefer to run migrations automatically on every deploy, use:

| Setting           | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| **Build Command** | `pnpm install && pnpm build && pnpm db:migrate && pnpm db:seed` |
| **Start Command** | `node build/index.js`                                           |

### 4. Configure environment variables

Add the following environment variables in Coolify (or import them from a file):

| Variable                    | Required | Description                                                                                                                                                                                  |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`              | **Yes**  | PostgreSQL connection string, e.g. `postgres://user:pass@host:5432/db`                                                                                                                       |
| `ORIGIN`                    | **Yes**  | Public application origin without a path, query, or fragment, e.g. `https://ensemblr.yourdomain.com`; HTTPS is required except on localhost and it also derives the post-logout `/login` URL |
| `BETTER_AUTH_SECRET`        | **Yes**  | High-entropy secret for signing local session cookies. Generate with `openssl rand -base64 32`                                                                                               |
| `OIDC_ISSUER_URL`           | **Yes**  | Exact OIDC issuer URL without `/.well-known/openid-configuration`; HTTPS is required except on localhost                                                                                     |
| `OIDC_CLIENT_ID`            | **Yes**  | Client ID for the confidential OIDC client                                                                                                                                                   |
| `OIDC_CLIENT_SECRET`        | **Yes**  | Client secret for the confidential OIDC client                                                                                                                                               |
| `API_KEY_ENCRYPTION_SECRET` | **Yes**  | High-entropy secret for encrypting stored provider API keys. Generate with `openssl rand -base64 32`                                                                                         |
| `DEMO_NAME`                 | No       | Display name for the credential-free demo account (default: `Demo`)                                                                                                                          |
| `DEMO_ALLOWED_MODELS`       | No       | Initial comma-separated `provider/model` IDs for demo users. Used only when the app settings row is first created.                                                                           |
| `ADDRESS_HEADER`            | No       | Trusted proxy header for client IP detection, e.g. `X-Forwarded-For`                                                                                                                         |
| `XFF_DEPTH`                 | No       | Number of trusted proxies when `ADDRESS_HEADER=X-Forwarded-For`                                                                                                                              |

### 5. Deploy

Click **Deploy** in Coolify. The build process will:

1. Install dependencies
2. Build the SvelteKit app into `build/`
3. Run migrations (if included in the build command)
4. Run the seed script (if included in the build command)
5. Start the Node server

### 6. First administrator login

After the first successful deploy, open `/login` and choose **Sign in as administrator**. The first provider-admitted identity creates the administrator on a fresh installation or binds to the sole legacy administrator on an upgraded installation. Additional provider-admitted identities receive separate administrator accounts with their own API keys and generation history.

### 7. Post-deployment database updates

If you add new Drizzle migrations in the future, you must run them against the production database. You can do this via Coolify's **Execute Command** feature:

```bash
pnpm db:migrate
```

Or by temporarily updating the **Build Command** to include `pnpm db:migrate` and redeploying.

---

## App Overview

- **Login**: `/login` — supports administrator OIDC authentication and one-click credential-free demo access
- **Workspace**: `/` — create and run mixture-of-agents generations
- **History**: `/history` — view, delete, or clear past generation runs
- **Settings**: `/settings` — manage provider API keys (encrypted at rest)
- **Admin**: `/admin` — configure prompt templates, demo model access, demo API keys, and demo rate limits (admin only). Prompt templates, demo model selections, and rate limits autosave; demo API credential creation and deletion remain explicit actions.

Model and provider options are fetched live from `https://models.dev/api.json`. Workspace selectors show only models from providers the current user has configured with an API key; demo users see only the admin-approved demo model list.
For demo users, generation uses admin-managed provider credentials from the environment variables advertised by the selected provider in the live catalog, such as `OPENAI_API_KEY` for OpenAI.
Demo generation history is scoped to the current login session, so visitors using the shared demo account do not see Recent runs or history entries from other demo sessions.
Demo generation is rate-limited before provider API calls are started. Defaults are 5 generations per IP and 25 total demo generations per 60-minute window; admins can change these values in the Admin console. In production behind a reverse proxy, configure SvelteKit's trusted client-address settings (`ADDRESS_HEADER` and, for `X-Forwarded-For`, `XFF_DEPTH`) so per-IP limits use visitor IPs instead of the proxy address.
