const emptySidebarHistory = {
	generations: [],
	nextCursor: null
};

export async function load({ locals }) {
	const sidebarHistory = locals.user
		? await (async () => {
				const { listGenerationSummaries } = await import('$lib/server/generation-summaries');
				return listGenerationSummaries({
					user: locals.user!,
					sessionId: locals.session!.id,
					cursor: null
				});
			})()
		: emptySidebarHistory;

	return {
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					email: locals.user.email,
					role: locals.user.role
				}
			: undefined,
		sidebarHistory
	};
}
