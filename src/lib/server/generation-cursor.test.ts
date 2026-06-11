import { describe, expect, it } from 'vitest';
import { decodeGenerationCursor, encodeGenerationCursor } from './generation-cursor';

describe('generation cursor', () => {
	it('round-trips a cursor', () => {
		const createdAt = new Date('2026-06-11T10:20:30.456Z');
		const encoded = encodeGenerationCursor({ createdAt, id: 'gen-123' });
		expect(decodeGenerationCursor(encoded)).toEqual({ createdAt, id: 'gen-123' });
	});

	it('produces an opaque URL-safe string', () => {
		const encoded = encodeGenerationCursor({ createdAt: new Date(), id: 'a/b+c' });
		expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('rejects malformed base64 input', () => {
		expect(decodeGenerationCursor('!!!not-base64!!!')).toBeUndefined();
	});

	it('rejects non-JSON payloads', () => {
		expect(decodeGenerationCursor(Buffer.from('hello').toString('base64url'))).toBeUndefined();
	});

	it('rejects payloads with missing or invalid fields', () => {
		const cases = [
			{},
			{ t: '2026-01-01T00:00:00Z' },
			{ id: 'x' },
			{ t: 'not-a-date', id: 'x' },
			{ t: 12345, id: 'x' },
			{ t: '2026-01-01T00:00:00Z', id: '' },
			{ t: '2026-01-01T00:00:00Z', id: 42 },
			null,
			'string',
			[1, 2]
		];
		for (const payload of cases) {
			const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
			expect(decodeGenerationCursor(encoded)).toBeUndefined();
		}
	});

	it('rejects an empty cursor', () => {
		expect(decodeGenerationCursor('')).toBeUndefined();
	});
});
