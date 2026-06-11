<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getHistoryContext } from '$lib/history/history.svelte';
	import { History, Loader2, Trash2 } from '@lucide/svelte';

	const history = getHistoryContext();

	function loadMoreOnNearEnd(node: HTMLElement) {
		const observer = new IntersectionObserver((observed) => {
			if (observed.some((entry) => entry.isIntersecting)) void history.loadMore();
		});
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}
</script>

<svelte:head><title>History | ensemblr</title></svelte:head>

<main class="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
	<PageHeader
		title="Generation history"
		description="Review, open, or delete past mixture-of-agents runs."
		icon={History}
	>
		{#snippet actions()}
			{#if history.entries.length > 0}
				<form
					method="POST"
					action="?/clear"
					use:enhance={() =>
						({ update }) => {
							history.clear();
							return update();
						}}
				>
					<Button type="submit" variant="destructive" size="sm">
						<Trash2 class="size-3.5" />
						Clear history
					</Button>
				</form>
			{/if}
		{/snippet}
	</PageHeader>

	<div class="space-y-2">
		{#each history.entries as item (item.id)}
			<article
				class="group relative min-w-0 rounded-lg border border-border bg-card p-4 hover:border-foreground/25 hover:bg-muted/40"
			>
				<a
					href={resolve(`/history/${item.id}`)}
					class="absolute inset-0 z-0 rounded-lg"
					aria-label="Open details for prompt: {item.prompt}"
				></a>

				<div
					class="pointer-events-none relative z-10 flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-start"
				>
					<div class="min-w-0 flex-1 space-y-1.5">
						<p class="line-clamp-2 text-sm leading-relaxed break-words text-foreground">
							{item.prompt}
						</p>
						<p class="text-xs text-muted-foreground tabular-nums">
							{item.createdAt.toLocaleString()}
						</p>
					</div>

					<div class="pointer-events-auto relative z-20 flex shrink-0 items-center gap-2">
						<GenerationStatus status={item.status} />
						<form
							method="POST"
							action="?/delete"
							use:enhance={() =>
								({ update }) => {
									history.remove(item.id);
									return update();
								}}
						>
							<input type="hidden" name="id" value={item.id} />
							<Button type="submit" variant="destructive" size="xs">
								<Trash2 class="size-3" />
								Delete
							</Button>
						</form>
					</div>
				</div>
			</article>
		{:else}
			<div class="flex flex-col items-center justify-center gap-2 py-20 text-center">
				<History class="size-7 text-muted-foreground" />
				<h2 class="text-sm font-medium text-foreground">No generations yet</h2>
				<p class="max-w-xs text-sm leading-relaxed text-muted-foreground">
					Run your first mixture-of-agents generation from the workspace and it will show up here.
				</p>
			</div>
		{/each}

		{#if history.nextCursor !== null}
			<div class="flex justify-center py-3" use:loadMoreOnNearEnd>
				{#if history.loadingMore}
					<Loader2 class="size-4 animate-spin text-muted-foreground" />
					<span class="sr-only">Loading more generations</span>
				{:else}
					<Button variant="outline" size="sm" onclick={() => history.loadMore()}>Load more</Button>
				{/if}
			</div>
		{/if}
	</div>
</main>
