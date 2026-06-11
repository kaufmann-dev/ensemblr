import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/authz';
import { decodeGenerationCursor, listGenerationSummaries } from '$lib/server/generation-summaries';

export async function GET({ locals, url }) {
	const user = requireUser(locals);
	const rawCursor = url.searchParams.get('cursor');

	let cursor;
	if (rawCursor !== null) {
		cursor = decodeGenerationCursor(rawCursor);
		if (!cursor) error(400, 'Invalid cursor');
	}

	return json(await listGenerationSummaries(user, locals.session!.id, cursor));
}
