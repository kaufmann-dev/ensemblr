export type GenerationCursor = { createdAt: Date; id: string };

export function encodeGenerationCursor(cursor: GenerationCursor): string {
	return Buffer.from(JSON.stringify({ t: cursor.createdAt.toISOString(), id: cursor.id })).toString(
		'base64url'
	);
}

export function decodeGenerationCursor(value: string): GenerationCursor | undefined {
	try {
		const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
		if (typeof parsed !== 'object' || parsed === null) return undefined;
		const { t, id } = parsed as { t?: unknown; id?: unknown };
		if (typeof t !== 'string' || typeof id !== 'string' || id === '') return undefined;
		const createdAt = new Date(t);
		if (Number.isNaN(createdAt.getTime())) return undefined;
		return { createdAt, id };
	} catch {
		return undefined;
	}
}
