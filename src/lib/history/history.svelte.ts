import { getContext, setContext } from 'svelte';

export type HistoryStatus = 'running' | 'completed' | 'failed';

export type HistoryEntry = {
	id: string;
	prompt: string;
	status: HistoryStatus;
	createdAt: Date;
};

export type SerializedHistoryEntry = Omit<HistoryEntry, 'createdAt'> & {
	createdAt: Date | string;
};

export type HistoryPage = {
	items: SerializedHistoryEntry[];
	nextCursor: string | null;
};

function toEntry(item: SerializedHistoryEntry): HistoryEntry {
	return { ...item, createdAt: new Date(item.createdAt) };
}

function byNewest(a: HistoryEntry, b: HistoryEntry) {
	return b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id);
}

export class GenerationHistoryStore {
	entries = $state<HistoryEntry[]>([]);
	nextCursor = $state<string | null>(null);
	loadingMore = $state(false);
	/** Incremented when "New generation" is pressed while already on /. */
	resetSignal = $state(0);

	runningIds = $derived(
		this.entries.filter((entry) => entry.status === 'running').map((entry) => entry.id)
	);

	/**
	 * Reconcile a server-loaded first page with locally known entries:
	 * seeded entries are authoritative, entries loaded from older pages
	 * or optimistic updates are kept.
	 */
	seed(page: HistoryPage) {
		const seeded = page.items.map(toEntry);
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- transient lookup set
		const seededIds = new Set(seeded.map((entry) => entry.id));
		const kept = this.entries.filter((entry) => !seededIds.has(entry.id));
		this.entries = [...seeded, ...kept].sort(byNewest);
		if (this.nextCursor === null || kept.length === 0) {
			this.nextCursor = page.nextCursor;
		}
	}

	async loadMore() {
		if (this.loadingMore || this.nextCursor === null) return;
		this.loadingMore = true;
		try {
			const response = await fetch(
				`/api/generations?cursor=${encodeURIComponent(this.nextCursor)}`
			);
			if (!response.ok) return;
			const page: HistoryPage = await response.json();
			// eslint-disable-next-line svelte/prefer-svelte-reactivity -- transient lookup set
			const known = new Set(this.entries.map((entry) => entry.id));
			this.entries = [
				...this.entries,
				...page.items.filter((item) => !known.has(item.id)).map(toEntry)
			].sort(byNewest);
			this.nextCursor = page.nextCursor;
		} catch {
			// Network failure: keep the cursor so a later scroll retries.
		} finally {
			this.loadingMore = false;
		}
	}

	upsert(item: SerializedHistoryEntry) {
		const entry = toEntry(item);
		const existing = this.entries.find((candidate) => candidate.id === entry.id);
		if (existing) {
			existing.prompt = entry.prompt;
			existing.status = entry.status;
			return;
		}
		this.entries = [entry, ...this.entries].sort(byNewest);
	}

	setStatus(id: string, status: HistoryStatus) {
		const entry = this.entries.find((candidate) => candidate.id === id);
		if (entry && entry.status !== status) entry.status = status;
	}

	remove(id: string) {
		this.entries = this.entries.filter((entry) => entry.id !== id);
	}

	clear() {
		this.entries = [];
		this.nextCursor = null;
	}

	requestNewGeneration() {
		this.resetSignal += 1;
	}
}

const KEY = Symbol('generation-history');

export function setHistoryContext(): GenerationHistoryStore {
	return setContext(KEY, new GenerationHistoryStore());
}

export function getHistoryContext(): GenerationHistoryStore {
	return getContext<GenerationHistoryStore>(KEY);
}
