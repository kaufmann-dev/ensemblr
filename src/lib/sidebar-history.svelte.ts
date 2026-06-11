import { createContext } from 'svelte';
import {
	appendSidebarHistoryPage,
	applyGenerationStreamEvent,
	clearSidebarHistory,
	createSidebarHistorySnapshot,
	reconcileSidebarHistoryPage,
	removeGenerationSummary,
	upsertGenerationSummary,
	updateGenerationSummaryStatus,
	type GenerationStreamSummaryEvent,
	type GenerationSummary,
	type SidebarHistoryPage
} from './sidebar-history.js';

export type FetchSidebarHistoryPage = (cursor: string) => Promise<SidebarHistoryPage>;

export class SidebarHistoryState {
	generations = $state.raw<GenerationSummary[]>([]);
	nextCursor = $state<string | null>(null);
	loading = $state(false);
	error = $state('');

	constructor(initial: SidebarHistoryPage) {
		this.#replace(createSidebarHistorySnapshot(initial));
	}

	#replace(page: SidebarHistoryPage) {
		this.generations = page.generations;
		this.nextCursor = page.nextCursor;
	}

	reconcile(page: SidebarHistoryPage) {
		this.#replace(
			reconcileSidebarHistoryPage(
				{ generations: this.generations, nextCursor: this.nextCursor },
				page
			)
		);
	}

	async loadOlder(fetchPage: FetchSidebarHistoryPage) {
		if (!this.nextCursor || this.loading) return;

		this.loading = true;
		this.error = '';
		const cursor = this.nextCursor;

		try {
			const page = await fetchPage(cursor);
			this.#replace(
				appendSidebarHistoryPage(
					{ generations: this.generations, nextCursor: this.nextCursor },
					page
				)
			);
		} catch (error) {
			this.error = error instanceof Error ? error.message : 'Could not load more history.';
		} finally {
			this.loading = false;
		}
	}

	startGeneration(summary: GenerationSummary) {
		this.#replace(
			upsertGenerationSummary(
				{ generations: this.generations, nextCursor: this.nextCursor },
				summary
			)
		);
	}

	updateStatus(id: string, status: string) {
		this.#replace(
			updateGenerationSummaryStatus(
				{ generations: this.generations, nextCursor: this.nextCursor },
				id,
				status
			)
		);
	}

	applyStreamEvent(id: string, event: GenerationStreamSummaryEvent) {
		this.#replace(
			applyGenerationStreamEvent(
				{ generations: this.generations, nextCursor: this.nextCursor },
				id,
				event
			)
		);
	}

	remove(id: string) {
		this.#replace(
			removeGenerationSummary({ generations: this.generations, nextCursor: this.nextCursor }, id)
		);
	}

	clear() {
		this.#replace(clearSidebarHistory());
	}
}

const [getSidebarHistoryContext, setSidebarHistoryContext] = createContext<SidebarHistoryState>();

export function setSidebarHistory(initial: SidebarHistoryPage) {
	return setSidebarHistoryContext(new SidebarHistoryState(initial));
}

export function getSidebarHistory() {
	return getSidebarHistoryContext();
}
