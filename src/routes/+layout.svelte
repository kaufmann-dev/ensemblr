<script lang="ts">
	import { untrack } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import { setHistoryContext } from '$lib/history/history.svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	const history = setHistoryContext();
	// Seed synchronously so the sidebar renders history on the server too.
	const initialPage = untrack(() => data.historyPage);
	if (initialPage) history.seed(initialPage);

	// Reconcile server-loaded history with locally known entries whenever
	// the layout data refreshes (navigation, invalidation).
	$effect.pre(() => {
		if (data.historyPage) history.seed(data.historyPage);
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

{#if data.user}
	<Sidebar.Provider>
		<AppSidebar user={data.user} />
		<Sidebar.Inset class="min-w-0">
			<header class="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
				<Sidebar.Trigger />
			</header>
			<div class="flex min-h-0 w-full flex-1 flex-col">
				{@render children()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{:else}
	<div class="flex min-h-screen flex-col bg-background text-foreground antialiased">
		{@render children()}
	</div>
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
