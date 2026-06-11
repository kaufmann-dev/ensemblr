import { and, eq } from 'drizzle-orm';
import { generation } from '$lib/server/db/schema';
export { canViewGeneration } from './generation-access-rules.js';

type HistoryUser = Pick<NonNullable<App.Locals['user']>, 'id' | 'role'>;

export function visibleGenerationsFor(user: HistoryUser, sessionId: string) {
	if (user.role === 'demo') {
		return and(eq(generation.userId, user.id), eq(generation.demoSessionId, sessionId));
	}

	return eq(generation.userId, user.id);
}
