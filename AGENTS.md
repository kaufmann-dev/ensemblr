# Repository Instructions

## Build and Verification

Derive final commands from `package.json`, `pnpm-workspace.yaml`, `drizzle.config.*`, CI, and deployment files. Use these defaults:

```bash
pnpm install
pnpm dev                     # Local development; do not start unless explicitly asked
pnpm check                   # Run before finishing Svelte/TypeScript changes
pnpm build                   # Run before finishing deployment/routing/server/adapter changes
pnpm test                    # Project test script from package.json
pnpm exec vitest run         # If Vitest is configured without a test script
pnpm drizzle-kit generate    # Generate schema migrations
pnpm drizzle-kit migrate     # Execute migrations
```

- Always use `pnpm` for package management.
- Always generate and run migrations through Drizzle Kit. Keep schema files, generated migrations, and migration execution aligned with the project Drizzle config.
- Preserve unrelated worktree state. Do not revert or overwrite unrelated user changes.
- Update existing root documentation when a change materially affects documented setup, usage, behavior, architecture, tooling, workflows, conventions, constraints, or visual decisions. Do not create new documentation files unless explicitly asked.

## Tooling

- **Svelte MCP**: Use before writing, reviewing, or refactoring Svelte or SvelteKit code.
  - Call `list-sections` to identify relevant documentation.
  - Fetch all relevant sections with `get-documentation`.
  - After writing Svelte code, run `svelte-autofixer` until it reports no issues or suggestions.
  - Generate a playground link only after the user asks for one, and only when the code was not written into the project.
- **Svelte file-editor**: Use this subagent for Svelte component/module work if available.
- **Playwright MCP**: Use for browser automation, visual verification, and end-to-end interaction testing. Do not substitute the Playwright CLI or another browser tool for MCP browser interaction.
- **GitHub MCP**: Use for GitHub issues, PRs, and remote repository file contents. Use local `git` for local repository state.
- **gh_grep MCP**: Use only for cross-repo or remote code examples. Use local `rg` for this cloned repository.
- **context7 MCP**: Use for version-specific library/framework documentation. Do not use it for general reasoning.
- Use project-scoped MCP configuration when supported. Store secrets in environment variables, not directly in MCP config files.
- Use optional MCP servers only when the relevant feature is being implemented: `postgres` requires `DATABASE_URL`, `resend` requires `RESEND_API_KEY`, and `glitchtip` requires `GLITCHTIP_MCP_URL`.
- Use `podman` instead of `docker` for all container operations.

## Technology Stack

- **Framework**: SvelteKit with `@sveltejs/adapter-node`
- **UI**: Tailwind CSS and `shadcn-svelte`
- **Icons**: `@lucide/svelte`
- **Theme**: `mode-watcher`
- **Database**: Drizzle with PostgreSQL
- **Auth**: Better Auth
- **Forms**: Superforms and Zod when user-facing forms are implemented
- **Email**: Resend and `better-svelte-email` when email is implemented
- **i18n**: Paraglide when internationalization is implemented
- **Testing**: Project `pnpm test` script by default; Vitest when unit/component testing is introduced
- **Analytics**: Plausible when analytics is implemented
- **Error Monitoring**: GlitchTip when error monitoring is implemented

Do not use frameworks or libraries just because they are installed. Keep optional infrastructure out of the project until its feature is being implemented.

## Svelte Implementation Patterns

Always treat this as a Svelte 5 project. Use runes, snippets, fine-grained reactivity, and current Svelte documentation as the source of truth.

### Core State and Props

- Use `$props()` for component inputs and forwarded props. Always treat props as changeable.
- Use `$state` only for values that must update the template, a derived value, or an effect.
- Use `$state.raw` for large objects, API responses, or arrays that are reassigned entirely without deep mutation tracking.
- Use `$derived` for computed state, including values derived from props.
- Use `$derived.by` only when computation requires a multi-line function.

### Reactivity and Effects (`$effect`)

Never use `$effect` unless absolutely necessary, such as syncing with external non-Svelte libraries. Using `$effect` for computed state or ordinary user-driven state changes is usually a sign the code should be refactored.

**Wrong: `$effect` for computed state**

```svelte
let rowsPerPageValue = $state(String(data.query.rows));

$effect(() => {
  rowsPerPageValue = String(data.query.rows);
});
```

**Right: Use `$derived`**

```svelte
let rowsPerPageValue = $derived(String(data.query.rows));
```

**Wrong: `$effect` to react to state changes**

```svelte
let currentPage = $state(data.query.page);

$effect(() => {
  navUpdate({ page: currentPage });
});

<Select bind:value={currentPage} />
```

**Right: React to events at the boundary**

```svelte
let currentPage = $state(data.query.page);

<Select
  bind:value={currentPage}
  onValueChange={(value) => navUpdate({ page: value })}
/>
```

**Wrong: `$effect` for type conversion with `bind:`**

```svelte
let query = $state({ rowsPerPage: 10 });
let rowsPerPageValue = $state(String(query.rowsPerPage));

$effect(() => {
  const n = Number.parseInt(rowsPerPageValue, 10);
  if (!Number.isFinite(n) || n === query.rowsPerPage) return;
  query.rowsPerPage = n;
});

<Select bind:value={rowsPerPageValue} />
```

**Right: Use getter/setter bindings**

```svelte
let query = $state({ rowsPerPage: 10 });

<Select
  bind:value={
    () => query.rowsPerPage.toString(),
    (value) => {
      query.rowsPerPage = Number.parseInt(value, 10);
    }
  }
/>
```

**Valid `$effect` escape hatch**

When an effect must write state, track the external source and keep reads of the written target out of the dependency set using `untrack`:

```svelte
import { untrack } from "svelte";

let source = $state(0);
let target = $state(0);

$effect(() => {
  const next = source + 1;

  untrack(() => {
    target = next;
  });
});
```

- Always write effects as browser-only by nature; effects do not run during server rendering.
- For global event listeners, use `<svelte:window>` or `<svelte:document>` rather than `onMount` or an effect.
- Use `createSubscriber` from `svelte/reactivity` to observe external sources.
- Use `$inspect.trace(label)` as the first line of a reactive block to debug update triggers.
- If an effect genuinely needs explicit dependency control and the project already uses `runed`, consider `watch`. Do not add `runed` only to avoid a small refactor.
- Keep `$effect` free of tracked read-write cycles.

### Component Architecture and Styling

Use modern Svelte replacements over legacy features:

- Use snippets and `{@render ...}` for reusable markup and component children.
- Use `<DynamicComponent>` for dynamic component rendering.
- Use `import Self from "./ThisComponent.svelte"` and `<Self>` for recursive rendering.
- Use classes with `$state` fields for shared reactive logic when it fits better than stores.
- Use `{@attach ...}` for new attachment code when current Svelte docs support it.
- Use `clsx`-style arrays and objects in `class` attributes for conditional classes.
- Use `onclick={...}` and other `on...` attributes for event listeners.
- Use keyed `{#each}` blocks with stable object identifiers. Never use the index as a key. Avoid destructuring if mutating the item.
- Use CSS custom properties for parent-to-child styling boundaries.
- Use `createContext` for typed context instead of unscoped shared module state when state must be per request or per tree.
- Enable `experimental.async` in `svelte.config.js` before using await expressions or hydratable behavior, and only when the installed Svelte version supports it.

For large or rarely used UI sections, especially admin tabs, live catalogs, and long model/provider lists:

- Do not fetch large catalogs in the initial server `load` unless the first viewport needs them.
- Do not mount thousands of hidden rows inside inactive tabs or panels.
- Lazy-load the heavy component and fetch its data when the user opens that section.
- Store large fetched arrays or objects in `$state.raw` when they are reassigned as whole values.

### Legacy Features to Avoid in New Code

Avoid these legacy Svelte features in new or refactored code:

- `export let`, `$$props`, `$$restProps`
- `$:` reactive blocks or assignments
- `<slot>`, `$$slots`, `<svelte:fragment>`
- `<svelte:component>` and `<svelte:self>`
- `use:action`
- `class:` directives
- `on:` event attributes, such as `on:click`

## UI and Styling

- **shadcn-svelte**: Components are source files copied into `src/lib/components/ui/`. Never import components from a package named `shadcn-svelte`.
  - Import components only from local `$lib/components/ui/...` paths.
  - Use local component source as the final source of truth once a component has been copied into the project.
  - Customize with Tailwind classes through `class`, using the local `cn()` helper when conditional class merging is needed.
  - Never run the CLI to install components, and never delete unused shadcn components during cleanup.
  - If a required shadcn component is missing from `src/lib/components/ui/`, stop and report the missing component instead of substituting another UI library or generating an ad hoc clone.
- Installed shadcn-svelte components: `accordion badge button card checkbox dialog input label scroll-area select separator sheet skeleton slider table tabs textarea tooltip`
- **Icons**: Always use `@lucide/svelte`.

  ```svelte
  <script lang="ts">
    import { Search } from "@lucide/svelte";
  </script>

  <Search class="size-4" />
  ```

- **Theming**: Use `setMode("light" | "dark" | "system")` or `toggleMode` from `mode-watcher` for controls. Add `ModeWatcher` once in the root layout:

  ```svelte
  <script lang="ts">
    import { ModeWatcher } from "mode-watcher";

    let { children } = $props();
  </script>

  <ModeWatcher />
  {@render children()}
  ```

## Backend and Services

- **Authentication**: Always use Better Auth for authentication and session management. Administrator login uses the generic OIDC plugin; the provider access policy is the sole administrator admission control. Check current Better Auth documentation before implementing providers, plugins, adapters, session handling, or account flows.
  - Server: `export const auth = betterAuth({ ... });`
  - Hook: `return svelteKitHandler({ event, resolve, auth, building });`
  - Cookies: `plugins: [sveltekitCookies(getRequestEvent)]`
- **Forms**: Use Superforms with Zod for user-facing forms. Follow the chain: `zod schema -> superforms -> formsnap -> shadcn-svelte form components`. Use `Form.Field`, `Form.Control`, snippet props, and shadcn form error components rather than ad hoc markup.
- **Email**: Use `better-svelte-email` for templates and Resend for delivery when email is implemented. Write templates as Svelte components, render them in server-only code, and send both HTML and plain text.

  ```ts
  import Renderer, { toPlainText } from "better-svelte-email/render";

  const renderer = new Renderer();
  const html = await renderer.render(EmailTemplate, { props });
  const text = toPlainText(html);
  ```

- **Persistence**: Always use Drizzle and PostgreSQL for persistence. Read database URLs from environment variables and keep secrets out of source files.

## Local Database and Deployment

- **Database**: Use the manually managed Podman PostgreSQL database named `postgres-sveltekit` for local development. Treat production database provisioning as separate infrastructure.
- **Debugging**: Keep deployment fixes scoped to the exact failing layer. Identify the failing command first in Coolify or Nixpacks before fixing it.

For Coolify and Nixpacks:

- If `pnpm-workspace.yaml` exists in a single-package app, keep a non-empty `packages` list with `.` included.
- Use `engines.node` and `nixpacks.toml` to pin compatible Node behavior when dependencies require a minimum patch version.
- Read deployment environment variables from `process.env`. Load `.env` only after checking that the file exists.
- Validate seed script environment variables before database operations.
- Seed app settings only when they are missing; do not overwrite admin-edited settings during redeploys.
- Let Nixpacks handle the install phase unless a project-specific reason requires otherwise.
- Prefer explicit deploy or runtime migration and seed steps when Coolify supports them.
- Keep build-time migration and seed scripts idempotent when they must run during image builds.
