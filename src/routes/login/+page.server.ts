import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { OIDC_PROVIDER_ID } from '$lib/oidc-policy';

export function load({ locals, url }) {
	if (locals.user) redirect(303, '/');
	return { oidcError: url.searchParams.has('error') };
}

export const actions = {
	oidc: async ({ request }) => {
		let authorizationUrl: string;
		try {
			const result = await auth.api.signInWithOAuth2({
				headers: request.headers,
				body: {
					providerId: OIDC_PROVIDER_ID,
					callbackURL: '/',
					errorCallbackURL: '/login?error=oidc'
				}
			});
			authorizationUrl = result.url;
		} catch {
			return fail(502, { message: 'Unable to start administrator sign-in' });
		}
		redirect(303, authorizationUrl);
	},
	demo: async ({ request }) => {
		try {
			await auth.api.signInDemo({ headers: request.headers });
		} catch {
			return fail(503, { message: 'Demo access is unavailable' });
		}
		redirect(303, '/');
	}
};
