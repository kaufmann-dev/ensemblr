<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { RotateCcw, SearchX, ShieldX, TriangleAlert } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.js';

	// SvelteKit's generic messages ("Not Found", "Internal Error", ...) add nothing to the title.
	const detail = $derived.by(() => {
		const message = page.error?.message;
		const generic = ['Not Found', 'Forbidden', 'Internal Error', `Error: ${page.status}`];
		return message && !generic.includes(message) ? message : null;
	});

	const content = $derived.by(() => {
		if (page.status === 404)
			return {
				icon: SearchX,
				title: 'Page not found',
				description:
					detail ?? "This page doesn't exist. It may have been moved, or the address has a typo."
			};
		if (page.status === 403)
			return {
				icon: ShieldX,
				title: 'Access denied',
				description: detail ?? "You don't have permission to view this page."
			};
		if (page.status < 500)
			return {
				icon: TriangleAlert,
				title: 'Request could not be completed',
				description: detail ?? 'The request was invalid.'
			};
		return {
			icon: TriangleAlert,
			title: 'Something went wrong',
			description: 'An unexpected error occurred. Try again in a moment.'
		};
	});
</script>

<svelte:head>
	<title>{content.title} · Ensemblr</title>
</svelte:head>

<main class="flex flex-1 items-center justify-center px-4 py-16">
	<div class="flex max-w-md flex-col items-center gap-4 text-center">
		<div
			class="flex size-10 items-center justify-center rounded border border-border bg-muted text-muted-foreground"
		>
			<content.icon class="size-5" />
		</div>
		<p class="font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
			Error {page.status}
		</p>
		<h1 class="text-xl font-semibold tracking-tight">{content.title}</h1>
		<p class="text-sm text-muted-foreground">{content.description}</p>
		<div class="mt-2 flex flex-wrap justify-center gap-2">
			{#if page.status >= 500}
				<Button class="rounded font-mono text-xs" onclick={() => location.reload()}>
					<RotateCcw class="size-3.5" />
					Try again
				</Button>
			{/if}
			<Button
				href={resolve('/')}
				variant={page.status >= 500 ? 'outline' : 'default'}
				class="rounded font-mono text-xs"
			>
				Back to workspace
			</Button>
		</div>
	</div>
</main>
