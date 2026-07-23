# Coolify build fails because Node.js is unavailable

- Fixed: 2026-07-23T14:36:08+02:00
- Diagnosed at commit: `7569f23baeee9845254dab57c8c7ce6a362f69d0`

## Symptom

Coolify failed during the Nixpacks setup phase with `undefined variable 'nodejs_24'`.

## Root cause

The repository pinned Nixpkgs revision `51ad838b03a05b1de6f9f2a0fffecee64a9788ee` in `nixpacks.toml`. Coolify selected Node.js 24 from the project's Node engine range, but that older Nixpkgs revision did not expose `nodejs_24`.

## Fix

Deleted the single-purpose `nixpacks.toml` archive override. Nixpacks can now select an archive that contains the Node.js version derived from `package.json`.

The deployment log from the same Coolify/Nixpacks installation already confirmed that an unpinned plan selected a compatible archive and completed dependency installation, the production build, database migrations, and database seeding. Its later failure occurred while exporting the container image and was unrelated to the application build or Node.js selection.
