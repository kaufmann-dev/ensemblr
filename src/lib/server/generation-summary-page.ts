import { encodeGenerationSummaryCursor } from './generation-summary-cursor.ts';

export const GENERATION_SUMMARY_PAGE_SIZE = 25;

export type GenerationSummaryRow = {
	id: string;
	prompt: string;
	status: string;
	createdAt: Date;
};

export type SerializedGenerationSummary = {
	id: string;
	prompt: string;
	status: string;
	createdAt: string;
};

export type GenerationSummaryPage = {
	generations: SerializedGenerationSummary[];
	nextCursor: string | null;
};

export function sortGenerationSummaryRows<T extends Pick<GenerationSummaryRow, 'id' | 'createdAt'>>(
	rows: T[]
): T[] {
	return [...rows].sort((a, b) => {
		const created = b.createdAt.getTime() - a.createdAt.getTime();
		if (created !== 0) return created;
		return b.id.localeCompare(a.id);
	});
}

export function serializeGenerationSummary(row: GenerationSummaryRow): SerializedGenerationSummary {
	return {
		id: row.id,
		prompt: row.prompt,
		status: row.status,
		createdAt: row.createdAt.toISOString()
	};
}

export function createGenerationSummaryPage(
	rows: GenerationSummaryRow[],
	pageSize = GENERATION_SUMMARY_PAGE_SIZE
): GenerationSummaryPage {
	const pageRows = rows.slice(0, pageSize);
	const finalItem = pageRows.at(-1);

	return {
		generations: pageRows.map(serializeGenerationSummary),
		nextCursor:
			rows.length > pageSize && finalItem
				? encodeGenerationSummaryCursor({
						createdAt: finalItem.createdAt,
						id: finalItem.id
					})
				: null
	};
}
