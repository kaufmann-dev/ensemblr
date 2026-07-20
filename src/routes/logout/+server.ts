import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { session } from '$lib/server/db/auth.schema';
import { getOidcPostLogoutRedirectUrl } from '$lib/oidc-policy';
import { getOidcLogoutUrl } from '$lib/server/oidc';

export async function POST({ request, locals, url }) {
	if (request.headers.get('origin') !== url.origin) error(403, 'Invalid logout request');

	let providerLogoutUrl: URL | undefined;
	if (locals.user?.role === 'admin' && locals.session) {
		const [storedSession] = await db
			.select({ idTokenHint: session.idTokenHint })
			.from(session)
			.where(eq(session.id, locals.session.id))
			.limit(1);
		if (storedSession?.idTokenHint && env.OIDC_ISSUER_URL && env.ORIGIN) {
			try {
				providerLogoutUrl = await getOidcLogoutUrl(
					env.OIDC_ISSUER_URL,
					storedSession.idTokenHint,
					getOidcPostLogoutRedirectUrl(env.ORIGIN)
				);
			} catch {
				providerLogoutUrl = undefined;
			}
		}
	}

	await auth.api.signOut({ headers: request.headers });
	if (providerLogoutUrl) redirect(303, providerLogoutUrl.toString());
	redirect(303, '/login');
}
