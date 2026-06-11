import assert from 'node:assert/strict';
import test from 'node:test';
import { canViewGeneration } from './generation-access-rules.ts';
import {
	MalformedGenerationCursorError,
	decodeGenerationSummaryCursor,
	encodeGenerationSummaryCursor
} from './generation-summary-cursor.ts';
import {
	GENERATION_SUMMARY_PAGE_SIZE,
	createGenerationSummaryPage,
	sortGenerationSummaryRows,
	type GenerationSummaryRow
} from './generation-summary-page.ts';

function row(id: string, createdAt: string): GenerationSummaryRow {
	return {
		id,
		prompt: `Prompt ${id}`,
		status: 'completed',
		createdAt: new Date(createdAt)
	};
}

test('encodes opaque generation summary cursors with timestamp and id', () => {
	const createdAt = new Date('2026-06-11T10:30:00.000Z');
	const cursor = encodeGenerationSummaryCursor({ createdAt, id: 'generation-z' });
	const decoded = decodeGenerationSummaryCursor(cursor);

	assert.doesNotMatch(cursor, /generation-z|2026-06-11/);
	assert.equal(decoded.id, 'generation-z');
	assert.equal(decoded.createdAt.toISOString(), createdAt.toISOString());
});

test('rejects malformed generation summary cursors', () => {
	for (const cursor of ['', 'not json', '!!!!', Buffer.from('{}').toString('base64url')]) {
		assert.throws(() => decodeGenerationSummaryCursor(cursor), MalformedGenerationCursorError);
	}
});

test('orders generation summaries by descending createdAt and descending id', () => {
	const createdAt = '2026-06-11T10:30:00.000Z';
	const ordered = sortGenerationSummaryRows([
		row('b', '2026-06-10T10:30:00.000Z'),
		row('a', createdAt),
		row('c', createdAt)
	]);

	assert.deepEqual(
		ordered.map((item) => item.id),
		['c', 'a', 'b']
	);
});

test('creates generation summary pages with a cursor at the 25 item boundary', () => {
	const rows = Array.from({ length: GENERATION_SUMMARY_PAGE_SIZE + 1 }, (_, index) =>
		row(`generation-${String(index).padStart(2, '0')}`, `2026-06-11T10:${59 - index}:00.000Z`)
	);
	const page = createGenerationSummaryPage(rows);
	const decoded = decodeGenerationSummaryCursor(page.nextCursor!);

	assert.equal(page.generations.length, GENERATION_SUMMARY_PAGE_SIZE);
	assert.equal(page.generations.at(-1)?.id, rows[GENERATION_SUMMARY_PAGE_SIZE - 1].id);
	assert.equal(decoded.id, rows[GENERATION_SUMMARY_PAGE_SIZE - 1].id);
	assert.equal(
		decoded.createdAt.toISOString(),
		rows[GENERATION_SUMMARY_PAGE_SIZE - 1].createdAt.toISOString()
	);
});

test('omits nextCursor when a page has no older generation beyond the boundary', () => {
	const rows = Array.from({ length: GENERATION_SUMMARY_PAGE_SIZE }, (_, index) =>
		row(`generation-${index}`, `2026-06-11T10:${59 - index}:00.000Z`)
	);

	assert.equal(createGenerationSummaryPage(rows).nextCursor, null);
});

test('applies user and demo-session generation visibility rules', () => {
	const user = { id: 'user-1', role: 'user' as const };
	const demo = { id: 'demo-1', role: 'demo' as const };

	assert.equal(
		canViewGeneration(user, 'session-a', { userId: 'user-1', demoSessionId: null }),
		true
	);
	assert.equal(
		canViewGeneration(user, 'session-a', { userId: 'user-2', demoSessionId: null }),
		false
	);
	assert.equal(
		canViewGeneration(demo, 'session-a', { userId: 'demo-1', demoSessionId: 'session-a' }),
		true
	);
	assert.equal(
		canViewGeneration(demo, 'session-a', { userId: 'demo-1', demoSessionId: 'session-b' }),
		false
	);
	assert.equal(
		canViewGeneration(demo, 'session-a', { userId: 'demo-1', demoSessionId: null }),
		false
	);
});
