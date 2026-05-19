# Ensemblr

SvelteKit app for running mixture-of-agents generations across models from the live `models.dev` catalog.

## Setup

```bash
pnpm install
cp .env.example .env
```

Configure:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
ORIGIN="http://localhost:5173"
BETTER_AUTH_SECRET="..."
API_KEY_ENCRYPTION_SECRET="..."
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="..."
DEMO_EMAIL="demo@example.com"
DEMO_PASSWORD="..."
DEMO_ALLOWED_MODELS="openai/gpt-4o-mini"
```

Run the development database:

```bash
docker run --name postgres-sveltekit --env-file .env --publish 5432:5432 --volume postgres-sveltekit-data:/var/lib/postgresql/data --detach postgres:18-alpine
```

Apply schema and seed accounts:

```bash
pnpm db:migrate
pnpm db:seed
```

## Development

```bash
pnpm dev
pnpm check
pnpm lint
pnpm build
```

Users sign in at `/login`. Admin users can update mixture prompt templates and demo model access at `/admin`. Non-demo users save provider API keys at `/settings`; keys are encrypted with `API_KEY_ENCRYPTION_SECRET` and are only decrypted server-side for generation requests.

Model/provider options are fetched from `https://models.dev/api.json`. Providers remain visible in admin/catalog UI, but inference is enabled only for installed AI SDK provider factories and OpenAI-compatible providers with a usable API base URL.
