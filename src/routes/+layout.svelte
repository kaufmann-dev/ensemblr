<script lang="ts">
	import { untrack } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { setAppShellContext } from '$lib/app-shell';
	import { setSidebarHistory } from '$lib/sidebar-history.svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
	const sidebarHistory = setSidebarHistory(untrack(() => data.sidebarHistory));
	setAppShellContext();

	$effect(() => {
		sidebarHistory.reconcile(data.sidebarHistory);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="Ensemblr runs mixture-of-agents generations across multiple AI models and saves generation history."
	/>
</svelte:head>

<ModeWatcher />

{#snippet legalFooter()}
	<footer class="px-4 pt-2 pb-5 text-center font-mono text-[10px] text-muted-foreground/70">
		<nav class="inline-flex items-center gap-3" aria-label="Legal links">
			<a
				class="rounded px-1 py-0.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/privacy?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Privacy
			</a>
			<span aria-hidden="true" class="text-muted-foreground/40">/</span>
			<a
				class="rounded px-1 py-0.5 underline-offset-4 transition-colors hover:text-foreground hover:underline"
				href="https://legal.kaufmann.dev/imprint?site=ensemblr.kaufmann.dev"
				rel="noreferrer"
			>
				Imprint
			</a>
		</nav>
	</footer>
{/snippet}

{#if data.user}
	<Sidebar.Provider>
		<AppSidebar user={data.user} />
		<Sidebar.Inset class="min-h-screen bg-background">
			<div class="flex min-h-screen flex-col bg-background text-foreground antialiased">
				<header
					class="sticky top-0 z-30 flex h-11 items-center border-b border-border bg-background/95 px-3 backdrop-blur"
					aria-label="Application sidebar controls"
				>
					<Sidebar.Trigger class="rounded text-muted-foreground hover:text-foreground" />
				</header>

				<div class="flex min-h-0 w-full flex-1 flex-col">
					{@render children()}
				</div>

				{@render legalFooter()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{:else}
	<div class="flex min-h-screen flex-col bg-background text-foreground antialiased">
		<div class="flex min-h-0 w-full flex-1 flex-col">
			{@render children()}
		</div>

		{@render legalFooter()}
	</div>
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
