<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<ModeWatcher />

<div class="min-h-screen bg-background text-foreground">
	{#if data.user}
		<header class="border-b bg-card">
			<div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
				<a href={resolve('/')} class="text-sm font-semibold tracking-normal">Ensemblr</a>
				<nav class="flex items-center gap-1">
					<a
						class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
						href={resolve('/')}>Workspace</a
					>
					<a
						class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
						href={resolve('/history')}>History</a
					>
					<a
						class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
						href={resolve('/settings')}>API Keys</a
					>
					{#if data.user.role === 'admin'}
						<a
							class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
							href={resolve('/admin')}>Admin</a
						>
					{/if}
					<form method="POST" action={resolve('/logout')}>
						<Button type="submit" variant="outline" size="sm">Sign out</Button>
					</form>
				</nav>
			</div>
		</header>
	{/if}

	{@render children()}
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
