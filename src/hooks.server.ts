import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth, authSessionCookie } from '#lib/server/auth.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { db } from '#lib/server/db/index.js';
import { session as sessionTable } from '#lib/server/db/auth.schema.js';
import { getSessionExpiry, isSessionExpired, isUserDrivenRequest } from '#lib/session-policy.js';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale)),
				preload: ({ type }) => type === 'js' || type === 'font'
			}
		)
	);

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers,
		query: { disableRefresh: true }
	});

	if (session) {
		const [storedSession] = await db
			.select({
				id: sessionTable.id,
				createdAt: sessionTable.createdAt,
				lastActiveAt: sessionTable.lastActiveAt
			})
			.from(sessionTable)
			.where(eq(sessionTable.id, session.session.id))
			.limit(1);
		const now = new Date();

		if (
			!storedSession ||
			isSessionExpired(storedSession.createdAt, storedSession.lastActiveAt, now)
		) {
			await auth.api.signOut({ headers: event.request.headers });
		} else {
			if (isUserDrivenRequest(event.request, event.url)) {
				const expiresAt = getSessionExpiry(storedSession.createdAt, now);
				await db
					.update(sessionTable)
					.set({ lastActiveAt: now, expiresAt, updatedAt: now })
					.where(eq(sessionTable.id, storedSession.id));

				const cookieValue = event.cookies.get(authSessionCookie.name);
				if (cookieValue) {
					event.cookies.set(authSessionCookie.name, cookieValue, {
						path: '/',
						httpOnly: true,
						secure: authSessionCookie.attributes.secure,
						sameSite: 'lax',
						maxAge: Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))
					});
				}
			}

			event.locals.session = session.session;
			event.locals.user = session.user as App.Locals['user'];
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = sequence(handleParaglide, handleBetterAuth);
