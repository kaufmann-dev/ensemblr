import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/authz';
import { MalformedGenerationCursorError } from '$lib/server/generation-summary-cursor';
import { listGenerationSummaries } from '$lib/server/generation-summaries';

export async function GET({ locals, url }) {
	const user = requireUser(locals);

	try {
		return json(
			await listGenerationSummaries({
				user,
				sessionId: locals.session!.id,
				cursor: url.searchParams.get('cursor')
			})
		);
	} catch (exception) {
		if (exception instanceof MalformedGenerationCursorError) {
			error(400, 'Malformed cursor');
		}

		throw exception;
	}
}
