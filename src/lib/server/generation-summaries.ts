import { and, desc, eq, lt, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import {
	GENERATION_SUMMARY_PAGE_SIZE,
	createGenerationSummaryPage
} from './generation-summary-page.js';
import { decodeGenerationSummaryCursor } from './generation-summary-cursor.js';

type GenerationSummaryUser = Pick<NonNullable<App.Locals['user']>, 'id' | 'role'>;

export async function listGenerationSummaries({
	user,
	sessionId,
	cursor
}: {
	user: GenerationSummaryUser;
	sessionId: string;
	cursor?: string | null;
}) {
	const decodedCursor = cursor ? decodeGenerationSummaryCursor(cursor) : null;
	const cursorCondition = decodedCursor
		? or(
				lt(generation.createdAt, decodedCursor.createdAt),
				and(eq(generation.createdAt, decodedCursor.createdAt), lt(generation.id, decodedCursor.id))
			)
		: undefined;

	const rows = await db
		.select({
			id: generation.id,
			prompt: generation.prompt,
			status: generation.status,
			createdAt: generation.createdAt
		})
		.from(generation)
		.where(and(visibleGenerationsFor(user, sessionId), cursorCondition))
		.orderBy(desc(generation.createdAt), desc(generation.id))
		.limit(GENERATION_SUMMARY_PAGE_SIZE + 1);

	return createGenerationSummaryPage(rows);
}
