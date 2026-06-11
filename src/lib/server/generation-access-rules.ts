type HistoryUser = {
	id: string;
	role: string;
};

type VisibleGenerationRecord = {
	userId: string;
	demoSessionId: string | null;
};

export function canViewGeneration(
	user: HistoryUser,
	sessionId: string,
	item: VisibleGenerationRecord
) {
	if (item.userId !== user.id) return false;
	return user.role !== 'demo' || item.demoSessionId === sessionId;
}
