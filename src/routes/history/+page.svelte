<script lang="ts">
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { History, Calendar, Trash2 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let runningIds = $derived(
		data.generations.filter((item) => item.status === 'running').map((item) => item.id)
	);

	// Svelte action to manage browser EventSource connections dynamically and cleanly without $effect
	function syncEvents(node: HTMLElement, currentIds: string[]) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const sources = new Map<string, EventSource>();

		const sync = (ids: string[]) => {
			// 1. Close and remove any connections that are no longer running
			for (const [id, source] of sources.entries()) {
				if (!ids.includes(id)) {
					source.close();
					sources.delete(id);
				}
			}
			// 2. Open new connections for newly running IDs
			for (const id of ids) {
				if (!sources.has(id)) {
					const source = new EventSource(resolve(`/api/generations/${id}/events`));
					sources.set(id, source);

					source.onmessage = (message) => {
						const event = JSON.parse(message.data);
						if (event.type === 'final' || (event.type === 'error' && !event.outputId)) {
							source.close();
							sources.delete(id);
							invalidateAll();
						}
					};
				}
			}
		};

		// Run initially on mount
		sync(currentIds);

		return {
			update(newIds: string[]) {
				// Svelte calls this hook automatically when the runningIds array updates
				sync(newIds);
			},
			destroy() {
				// Clean up all active connections when the component is unmounted
				for (const source of sources.values()) {
					source.close();
				}
				sources.clear();
			}
		};
	}
</script>

<svelte:head><title>History | ensemblr</title></svelte:head>

<main
	class="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-start space-y-6 bg-background px-4 py-8"
>
	<PageHeader
		title="Generation history"
		description="Inspect historical Mixture-of-Agents synthesis runs"
		icon={History}
	/>

	{#if data.generations.length > 0}
		<div class="flex justify-end px-1">
			<form method="POST" action="?/clear">
				<Button type="submit" variant="destructive" size="sm" class="h-7.5 rounded text-[10px]">
					<Trash2 class="mr-1 size-3.5" />
					Clear history
				</Button>
			</form>
		</div>
	{/if}

	<div class="space-y-2 px-1" use:syncEvents={runningIds}>
		{#each data.generations as item (item.id)}
			<article
				class="group relative min-w-0 rounded border border-border bg-muted/20 p-4 hover:border-foreground/30 hover:bg-muted/50"
			>
				<!-- Stretched overlay link covering the entire card -->
				<a
					href={resolve(`/history/${item.id}`)}
					class="absolute inset-0 z-0 rounded"
					aria-label="Open details for prompt: {item.prompt}"
				></a>

				<div
					class="pointer-events-none relative z-10 flex w-full flex-col justify-between gap-3 sm:flex-row sm:items-start"
				>
					<div class="min-w-0 flex-1 space-y-2">
						<p
							class="line-clamp-2 font-mono text-xs leading-relaxed break-words text-foreground/80 group-hover:text-foreground"
						>
							{item.prompt}
						</p>
						<div
							class="flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
						>
							<span class="flex items-center gap-1">
								<Calendar class="size-3 text-muted-foreground" />
								<span class="font-mono text-[9px] tabular-nums"
									>{new Date(item.createdAt).toLocaleString()}</span
								>
							</span>
							<span
								class="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] lowercase"
							>
								id: {item.id.slice(0, 8)}...
							</span>
						</div>
					</div>

					<div class="pointer-events-auto relative z-20 flex shrink-0 flex-wrap items-center gap-2">
						<GenerationStatus status={item.status} />
						<form method="POST" action="?/delete">
							<input type="hidden" name="id" value={item.id} />
							<Button type="submit" variant="destructive" size="xs" class="rounded text-[10px]">
								<Trash2 class="mr-1 size-3" />
								Delete
							</Button>
						</form>
					</div>
				</div>
			</article>
		{:else}
			<div class="flex flex-col items-center justify-center py-20 text-center">
				<History class="size-7 text-muted-foreground mb-2 stroke-[1.5]" />
				<h3 class="text-xs font-mono font-bold text-foreground">Archive Empty</h3>
				<p class="text-[10px] font-mono text-muted-foreground mt-1 max-w-xs leading-relaxed">
					You haven't run any Mixture-of-Agents generations yet. Go to the Workspace dashboard to
					trigger your first run!
				</p>
			</div>
		{/each}
	</div>
</main>
