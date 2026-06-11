import assert from 'node:assert/strict';
import test from 'node:test';
import { getNewGenerationIntent, isActiveNavigation } from './app-shell.ts';
import {
	appendSidebarHistoryPage,
	applyGenerationStreamEvent,
	clearSidebarHistory,
	createSidebarHistorySnapshot,
	preserveScrollTopAfterAppend,
	reconcileSidebarHistoryPage,
	removeGenerationSummary,
	shouldLoadOlderHistory,
	upsertGenerationSummary,
	type GenerationSummary,
	type SidebarHistorySnapshot
} from './sidebar-history.ts';

function summary(id: string, createdAt: string, status = 'completed'): GenerationSummary {
	return {
		id,
		prompt: `Prompt ${id}`,
		status,
		createdAt
	};
}

const firstPage = {
	generations: [summary('b', '2026-06-11T10:30:00.000Z'), summary('a', '2026-06-11T10:30:00.000Z')],
	nextCursor: 'cursor-a'
};

test('seeds sidebar history from the initial root-layout page', () => {
	const state = createSidebarHistorySnapshot(firstPage);

	assert.deepEqual(
		state.generations.map((item) => item.id),
		['b', 'a']
	);
	assert.equal(state.nextCursor, 'cursor-a');
});

test('appends incrementally loaded older history pages', () => {
	const state = appendSidebarHistoryPage(createSidebarHistorySnapshot(firstPage), {
		generations: [
			summary('older-1', '2026-06-10T10:30:00.000Z'),
			summary('older-2', '2026-06-09T10:30:00.000Z')
		],
		nextCursor: 'cursor-older'
	});

	assert.deepEqual(
		state.generations.map((item) => item.id),
		['b', 'a', 'older-1', 'older-2']
	);
	assert.equal(state.nextCursor, 'cursor-older');
});

test('detects the sidebar scroll boundary and preserves scroll position after append', () => {
	assert.equal(
		shouldLoadOlderHistory({ scrollTop: 800, clientHeight: 180, scrollHeight: 1000 }),
		true
	);
	assert.equal(
		shouldLoadOlderHistory({ scrollTop: 600, clientHeight: 180, scrollHeight: 1000 }),
		false
	);
	assert.equal(preserveScrollTopAfterAppend(812), 812);
});

test('preserves already loaded pages when root-layout history data reconciles', () => {
	const loaded: SidebarHistorySnapshot = {
		generations: [
			summary('b', '2026-06-11T10:30:00.000Z', 'running'),
			summary('a', '2026-06-11T10:30:00.000Z'),
			summary('older', '2026-06-10T10:30:00.000Z')
		],
		nextCursor: null
	};
	const reconciled = reconcileSidebarHistoryPage(loaded, {
		generations: [
			summary('new', '2026-06-11T10:31:00.000Z', 'running'),
			summary('b', '2026-06-11T10:30:00.000Z', 'completed')
		],
		nextCursor: 'new-cursor'
	});

	assert.deepEqual(
		reconciled.generations.map((item) => `${item.id}:${item.status}`),
		['new:running', 'b:completed', 'a:completed', 'older:completed']
	);
	assert.equal(reconciled.nextCursor, null);
});

test('preserves active navigation state for top-level and detail routes', () => {
	assert.equal(isActiveNavigation('/', '/'), true);
	assert.equal(isActiveNavigation('/history', '/history'), true);
	assert.equal(isActiveNavigation('/history/generation-1', '/history'), true);
	assert.equal(isActiveNavigation('/settings', '/history'), false);
	assert.equal(isActiveNavigation('/history', '/'), false);
});

test('resolves new generation behavior for workspace and other authenticated routes', () => {
	assert.equal(getNewGenerationIntent('/'), 'reset-workspace');
	assert.equal(getNewGenerationIntent('/history'), 'navigate-workspace');
	assert.equal(getNewGenerationIntent('/settings'), 'navigate-workspace');
});

test('adds started generations and updates visible running statuses from stream events', () => {
	const started = upsertGenerationSummary(createSidebarHistorySnapshot(firstPage), {
		...summary('running', '2026-06-11T10:31:00.000Z', 'running'),
		prompt: 'Fresh prompt'
	});
	const snapshotted = applyGenerationStreamEvent(started, 'running', {
		type: 'snapshot',
		generation: { status: 'running' }
	});
	const completed = applyGenerationStreamEvent(snapshotted, 'running', { type: 'final' });
	const failed = applyGenerationStreamEvent(started, 'running', { type: 'error' });

	assert.equal(started.generations[0].id, 'running');
	assert.equal(completed.generations[0].status, 'completed');
	assert.equal(failed.generations[0].status, 'failed');
});

test('reconciles sidebar history after deletion and clearing', () => {
	const state = createSidebarHistorySnapshot(firstPage);
	const removed = removeGenerationSummary(state, 'a');
	const cleared = clearSidebarHistory();

	assert.deepEqual(
		removed.generations.map((item) => item.id),
		['b']
	);
	assert.deepEqual(cleared, { generations: [], nextCursor: null });
});
