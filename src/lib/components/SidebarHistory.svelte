<script lang="ts">
	import { tick } from 'svelte';
	import { fromAction } from 'svelte/attachments';
	import { SvelteMap } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { getSidebarHistory } from '$lib/sidebar-history.svelte';
	import {
		preserveScrollTopAfterAppend,
		shouldLoadOlderHistory,
		type GenerationStreamSummaryEvent,
		type SidebarHistoryPage
	} from '$lib/sidebar-history';
	import { AlertCircle, Calendar, History, Loader, RefreshCw } from '@lucide/svelte';

	const history = getSidebarHistory();
	const sidebar = Sidebar.useSidebar();
	let historyViewport = $state<HTMLDivElement | null>(null);
	let runningIds = $derived(
		history.generations.filter((item) => item.status === 'running').map((item) => item.id)
	);

	async function fetchOlderHistoryPage(cursor: string): Promise<SidebarHistoryPage> {
		const response = await fetch(
			`${resolve('/api/generations')}?cursor=${encodeURIComponent(cursor)}`
		);
		if (!response.ok) throw new Error('Could not load more history.');
		return (await response.json()) as SidebarHistoryPage;
	}

	async function loadOlderFromViewport() {
		if (!historyViewport || !history.nextCursor || history.loading) return;
		const previousScrollTop = historyViewport.scrollTop;

		await history.loadOlder(fetchOlderHistoryPage);
		await tick();

		if (historyViewport) {
			historyViewport.scrollTop = preserveScrollTopAfterAppend(previousScrollTop);
		}
	}

	function handleHistoryScroll() {
		if (!historyViewport) return;
		if (
			shouldLoadOlderHistory({
				scrollTop: historyViewport.scrollTop,
				clientHeight: historyViewport.clientHeight,
				scrollHeight: historyViewport.scrollHeight
			})
		) {
			void loadOlderFromViewport();
		}
	}

	function closeMobileSidebar() {
		if (sidebar.isMobile) sidebar.setOpenMobile(false);
	}

	function terminalEvent(event: GenerationStreamSummaryEvent) {
		return (
			event.type === 'final' ||
			(event.type === 'error' && !event.outputId) ||
			(event.type === 'snapshot' && event.generation.status !== 'running')
		);
	}

	function syncRunningEvents(node: HTMLElement, currentIds: string[]) {
		void node;
		const sources = new SvelteMap<string, EventSource>();

		const close = (id: string) => {
			const source = sources.get(id);
			if (!source) return;
			source.close();
			sources.delete(id);
		};

		const sync = (ids: string[]) => {
			const visible = new Set(ids);
			for (const id of sources.keys()) {
				if (!visible.has(id)) close(id);
			}

			for (const id of visible) {
				if (sources.has(id)) continue;
				const source = new EventSource(resolve(`/api/generations/${id}/events`));
				sources.set(id, source);
				source.onmessage = (message) => {
					const event = JSON.parse(message.data) as GenerationStreamSummaryEvent;
					history.applyStreamEvent(id, event);
					if (terminalEvent(event)) close(id);
				};
				source.onerror = () => close(id);
			}
		};

		sync(currentIds);

		return {
			update: sync,
			destroy() {
				for (const id of [...sources.keys()]) close(id);
			}
		};
	}

	function createdAtLabel(value: string) {
		return new Date(value).toLocaleString();
	}
</script>

<Sidebar.Group
	class="min-h-0 flex-1 group-data-[collapsible=icon]:hidden"
	aria-label="Recent generation history"
>
	<Sidebar.GroupLabel class="px-2">Recent generations</Sidebar.GroupLabel>
	<Sidebar.GroupContent class="min-h-0 flex-1">
		<div
			bind:this={historyViewport}
			onscroll={handleHistoryScroll}
			class="max-h-[calc(100svh-19rem)] min-h-0 space-y-1 overflow-y-auto px-2 pb-2"
			{@attach fromAction(syncRunningEvents, () => runningIds)}
		>
			{#each history.generations as item (item.id)}
				<a
					href={resolve(`/history/${item.id}`)}
					class="block rounded border border-transparent p-2 text-left transition-colors hover:border-sidebar-border hover:bg-sidebar-accent focus-visible:bg-sidebar-accent"
					aria-label="Open saved generation: {item.prompt}"
					onclick={closeMobileSidebar}
				>
					<span class="line-clamp-2 text-xs leading-snug break-words text-sidebar-foreground">
						{item.prompt}
					</span>
					<span class="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
						<GenerationStatus status={item.status} />
						<span class="inline-flex min-w-0 items-center gap-1">
							<Calendar class="size-3 shrink-0" />
							<span class="truncate tabular-nums">{createdAtLabel(item.createdAt)}</span>
						</span>
					</span>
				</a>
			{:else}
				<div class="rounded border border-dashed border-sidebar-border p-4 text-center">
					<History class="mx-auto mb-2 size-5 text-muted-foreground/50" />
					<p class="text-xs font-medium text-sidebar-foreground">No generations yet</p>
					<p class="mt-1 text-[10px] leading-relaxed text-muted-foreground">
						Recent saved generations will appear here.
					</p>
				</div>
			{/each}

			{#if history.loading}
				<div class="flex items-center justify-center gap-2 py-3 text-[10px] text-muted-foreground">
					<Loader class="size-3 animate-spin" />
					<span>Loading older generations</span>
				</div>
			{/if}

			{#if history.error}
				<div
					class="rounded border border-destructive/20 bg-destructive/5 p-2 text-[10px] text-destructive"
				>
					<div class="flex items-start gap-1.5">
						<AlertCircle class="mt-0.5 size-3 shrink-0" />
						<p>{history.error}</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						class="mt-2 h-6 rounded text-[10px] text-destructive hover:bg-destructive/10"
						onclick={() => void loadOlderFromViewport()}
					>
						<RefreshCw class="size-3" />
						Retry
					</Button>
				</div>
			{/if}
		</div>
	</Sidebar.GroupContent>
</Sidebar.Group>
