import { and, desc, eq, lt, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { generation } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import { encodeGenerationCursor, type GenerationCursor } from '$lib/server/generation-cursor';

export { decodeGenerationCursor, encodeGenerationCursor } from '$lib/server/generation-cursor';

export const GENERATION_PAGE_SIZE = 25;

export type GenerationSummary = {
	id: string;
	prompt: string;
	status: 'running' | 'completed' | 'failed';
	createdAt: Date;
};

export type GenerationPage = {
	items: GenerationSummary[];
	nextCursor: string | null;
};

type HistoryUser = Pick<NonNullable<App.Locals['user']>, 'id' | 'role'>;

export async function listGenerationSummaries(
	user: HistoryUser,
	sessionId: string,
	cursor?: GenerationCursor
): Promise<GenerationPage> {
	const visibility = visibleGenerationsFor(user, sessionId);
	const where = cursor
		? and(
				visibility,
				or(
					lt(generation.createdAt, cursor.createdAt),
					and(eq(generation.createdAt, cursor.createdAt), lt(generation.id, cursor.id))
				)
			)
		: visibility;

	const rows = await db
		.select({
			id: generation.id,
			prompt: generation.prompt,
			status: generation.status,
			createdAt: generation.createdAt
		})
		.from(generation)
		.where(where)
		.orderBy(desc(generation.createdAt), desc(generation.id))
		.limit(GENERATION_PAGE_SIZE + 1);

	const items = rows.slice(0, GENERATION_PAGE_SIZE);
	const last = items.at(-1);
	const nextCursor =
		rows.length > GENERATION_PAGE_SIZE && last ? encodeGenerationCursor(last) : null;

	return { items, nextCursor };
}
