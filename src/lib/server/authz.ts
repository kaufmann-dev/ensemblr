import { redirect } from '@sveltejs/kit';

export function requireUser(locals: App.Locals) {
	if (!locals.user) redirect(303, '/login');
	return locals.user;
}

export function requireAdmin(locals: App.Locals) {
	const user = requireUser(locals);
	if (user.role !== 'admin') redirect(303, '/');
	return user;
}
