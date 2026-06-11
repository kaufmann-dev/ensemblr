import { listGenerationSummaries } from '$lib/server/generation-summaries';

export async function load({ locals }) {
	if (!locals.user) {
		return { user: undefined, historyPage: undefined };
	}

	return {
		user: {
			id: locals.user.id,
			name: locals.user.name,
			email: locals.user.email,
			role: locals.user.role
		},
		historyPage: await listGenerationSummaries(locals.user, locals.session!.id)
	};
}
