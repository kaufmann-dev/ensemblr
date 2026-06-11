export type GenerationSummaryCursor = {
	createdAt: Date;
	id: string;
};

type EncodedGenerationSummaryCursor = {
	createdAt: string;
	id: string;
};

export class MalformedGenerationCursorError extends Error {
	constructor() {
		super('Malformed generation cursor');
		this.name = 'MalformedGenerationCursorError';
	}
}

function normalizeCreatedAt(createdAt: Date | string): Date {
	const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
	if (Number.isNaN(date.getTime())) throw new MalformedGenerationCursorError();
	return date;
}

export function encodeGenerationSummaryCursor(input: {
	createdAt: Date | string;
	id: string;
}): string {
	if (!input.id) throw new MalformedGenerationCursorError();
	const payload: EncodedGenerationSummaryCursor = {
		createdAt: normalizeCreatedAt(input.createdAt).toISOString(),
		id: input.id
	};

	return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeGenerationSummaryCursor(cursor: string): GenerationSummaryCursor {
	if (!/^[A-Za-z0-9_-]+$/.test(cursor)) throw new MalformedGenerationCursorError();

	try {
		const payload = JSON.parse(
			Buffer.from(cursor, 'base64url').toString('utf8')
		) as Partial<EncodedGenerationSummaryCursor>;
		if (!payload || typeof payload.id !== 'string' || payload.id.length === 0) {
			throw new MalformedGenerationCursorError();
		}
		if (typeof payload.createdAt !== 'string') throw new MalformedGenerationCursorError();

		return {
			createdAt: normalizeCreatedAt(payload.createdAt),
			id: payload.id
		};
	} catch (error) {
		if (error instanceof MalformedGenerationCursorError) throw error;
		throw new MalformedGenerationCursorError();
	}
}
