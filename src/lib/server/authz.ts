import { redirect } from '@sveltejs/kit';
import { getRequestEvent } from '$app/server';

export function requireUser(locals: App.Locals) {
	if (!locals.user) {
		const { url } = getRequestEvent();
		const returnTo = `${url.pathname}${url.search}`;
		redirect(303, returnTo === '/' ? '/login' : `/login?returnTo=${encodeURIComponent(returnTo)}`);
	}
	return locals.user;
}

export function requireAdmin(locals: App.Locals) {
	const user = requireUser(locals);
	if (user.role !== 'admin') redirect(303, '/');
	return user;
}
