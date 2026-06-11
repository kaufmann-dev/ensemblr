export type GenerationSummary = {
	id: string;
	prompt: string;
	status: string;
	createdAt: string;
};

export type SidebarHistoryPage = {
	generations: GenerationSummary[];
	nextCursor: string | null;
};

export type SidebarHistorySnapshot = SidebarHistoryPage;

export type ScrollMetrics = {
	scrollTop: number;
	clientHeight: number;
	scrollHeight: number;
};

export type GenerationStreamSummaryEvent =
	| { type: 'snapshot'; generation: { status: string } }
	| { type: 'final' }
	| { type: 'error'; outputId?: string }
	| { type: 'generation' | 'status' | 'text' };

export const SIDEBAR_HISTORY_SCROLL_THRESHOLD = 96;

export function sortGenerationSummaries<T extends Pick<GenerationSummary, 'id' | 'createdAt'>>(
	items: T[]
): T[] {
	return [...items].sort((a, b) => {
		const created = Date.parse(b.createdAt) - Date.parse(a.createdAt);
		if (created !== 0) return created;
		return b.id.localeCompare(a.id);
	});
}

export function createSidebarHistorySnapshot(page: SidebarHistoryPage): SidebarHistorySnapshot {
	return {
		generations: sortGenerationSummaries(page.generations),
		nextCursor: page.nextCursor
	};
}

export function appendSidebarHistoryPage(
	current: SidebarHistorySnapshot,
	page: SidebarHistoryPage
): SidebarHistorySnapshot {
	const byId = new Map(current.generations.map((item) => [item.id, item]));
	for (const item of page.generations) byId.set(item.id, item);

	return {
		generations: sortGenerationSummaries([...byId.values()]),
		nextCursor: page.nextCursor
	};
}

export function reconcileSidebarHistoryPage(
	current: SidebarHistorySnapshot,
	page: SidebarHistoryPage
): SidebarHistorySnapshot {
	if (page.generations.length === 0 && page.nextCursor === null) {
		return createSidebarHistorySnapshot(page);
	}

	const incomingIds = new Set(page.generations.map((item) => item.id));
	const retained = current.generations.filter((item) => !incomingIds.has(item.id));
	const nextCursor =
		current.generations.length > page.generations.length ? current.nextCursor : page.nextCursor;

	return {
		generations: sortGenerationSummaries([...page.generations, ...retained]),
		nextCursor
	};
}

export function upsertGenerationSummary(
	current: SidebarHistorySnapshot,
	summary: GenerationSummary
): SidebarHistorySnapshot {
	const byId = new Map(current.generations.map((item) => [item.id, item]));
	byId.set(summary.id, { ...byId.get(summary.id), ...summary });

	return {
		generations: sortGenerationSummaries([...byId.values()]),
		nextCursor: current.nextCursor
	};
}

export function updateGenerationSummaryStatus(
	current: SidebarHistorySnapshot,
	id: string,
	status: string
): SidebarHistorySnapshot {
	return {
		generations: current.generations.map((item) => (item.id === id ? { ...item, status } : item)),
		nextCursor: current.nextCursor
	};
}

export function removeGenerationSummary(
	current: SidebarHistorySnapshot,
	id: string
): SidebarHistorySnapshot {
	return {
		generations: current.generations.filter((item) => item.id !== id),
		nextCursor: current.nextCursor
	};
}

export function clearSidebarHistory(): SidebarHistorySnapshot {
	return { generations: [], nextCursor: null };
}

export function statusFromGenerationStreamEvent(
	event: GenerationStreamSummaryEvent
): string | null {
	if (event.type === 'snapshot') return event.generation.status;
	if (event.type === 'final') return 'completed';
	if (event.type === 'error' && !event.outputId) return 'failed';
	return null;
}

export function applyGenerationStreamEvent(
	current: SidebarHistorySnapshot,
	id: string,
	event: GenerationStreamSummaryEvent
): SidebarHistorySnapshot {
	const status = statusFromGenerationStreamEvent(event);
	return status ? updateGenerationSummaryStatus(current, id, status) : current;
}

export function shouldLoadOlderHistory(
	metrics: ScrollMetrics,
	threshold = SIDEBAR_HISTORY_SCROLL_THRESHOLD
): boolean {
	return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}

export function preserveScrollTopAfterAppend(previousScrollTop: number): number {
	return previousScrollTop;
}
