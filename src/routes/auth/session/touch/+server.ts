import { error } from '@sveltejs/kit';
import { isUserDrivenRequest } from '$lib/session-policy';

export function POST({ locals, request, url }) {
	if (!isUserDrivenRequest(request, url)) error(403, 'Invalid session touch');
	if (!locals.user) error(401, 'Authentication required');
	return new Response(null, { status: 204 });
}
