import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'user',
				input: false
			}
		}
	},
	emailAndPassword: { enabled: true },
	plugins: [
		{
			id: 'demo-login',
			endpoints: {
				signInDemo: createAuthEndpoint('/sign-in/demo', { method: 'POST' }, async (ctx) => {
					const [demoUser] = await db.select().from(user).where(eq(user.role, 'demo')).limit(1);
					if (!demoUser) {
						throw new APIError('NOT_FOUND', { message: 'Demo account is not configured' });
					}

					const session = await ctx.context.internalAdapter.createSession(demoUser.id);
					if (!session) {
						throw new APIError('BAD_REQUEST', { message: 'Unable to create demo session' });
					}

					await setSessionCookie(ctx, { session, user: demoUser });

					return ctx.json({ token: session.token, user: demoUser });
				})
			}
		},
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
