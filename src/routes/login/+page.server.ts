import { fail, redirect } from '@sveltejs/kit';
import { auth } from '#lib/server/auth.js';
import { safeReturnTo } from '#lib/oidc-policy.js';

export function load({ locals, url }) {
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
	if (locals.user) redirect(303, returnTo);
	return { oidcError: url.searchParams.has('error'), returnTo };
}

export const actions = {
	demo: async ({ request, url }) => {
		try {
			await auth.api.signInDemo({ headers: request.headers });
		} catch {
			return fail(503, { message: 'Demo access is unavailable' });
		}
		redirect(303, safeReturnTo(url.searchParams.get('returnTo')));
	}
};
