import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { getCookies, setSessionCookie } from 'better-auth/cookies';
import { genericOAuth } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import {
	BETTER_AUTH_SECRET,
	OIDC_CLIENT_ID,
	OIDC_CLIENT_SECRET,
	OIDC_ISSUER_URL,
	ORIGIN
} from '$app/env/private';
import { getRequestEvent } from '$app/server';
import { db } from '#lib/server/db/index.js';
import { user } from '#lib/server/db/auth.schema.js';
import { bindFirstOidcAdmin } from '#lib/server/oidc.js';
import {
	OIDC_PROVIDER_ID,
	OIDC_SCOPES,
	getOidcDiscoveryUrl,
	normalizeApplicationOrigin,
	normalizeOidcIssuerUrl,
	withoutAccountTokens
} from '#lib/oidc-policy.js';
import { SESSION_IDLE_TIMEOUT_MS } from '#lib/session-policy.js';

function requiredEnv(name: string, value: string | undefined) {
	if (!value) throw new Error(`${name} is required`);
	return value;
}

const origin = normalizeApplicationOrigin(requiredEnv('ORIGIN', ORIGIN));
const oidcIssuerUrl = normalizeOidcIssuerUrl(requiredEnv('OIDC_ISSUER_URL', OIDC_ISSUER_URL));

export const authSessionCookie = getCookies({
	baseURL: origin,
	session: { expiresIn: SESSION_IDLE_TIMEOUT_MS / 1000 }
}).sessionToken;

type AuthHookContext = { path?: string; params?: Record<string, unknown> } | null;

function isOidcCallback(context: AuthHookContext) {
	return (
		context?.path?.startsWith('/callback/') === true && context.params?.id === OIDC_PROVIDER_ID
	);
}

export const auth = betterAuth({
	baseURL: origin,
	secret: requiredEnv('BETTER_AUTH_SECRET', BETTER_AUTH_SECRET),
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: false },
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: true,
				defaultValue: 'admin',
				input: false
			}
		}
	},
	session: {
		expiresIn: SESSION_IDLE_TIMEOUT_MS / 1000,
		disableSessionRefresh: true,
		additionalFields: {
			lastActiveAt: {
				type: 'date',
				required: true,
				defaultValue: () => new Date(),
				input: false,
				returned: false
			}
		}
	},
	account: {
		accountLinking: {
			disableImplicitLinking: true
		}
	},
	databaseHooks: {
		account: {
			create: { before: async (accountData) => ({ data: withoutAccountTokens(accountData) }) },
			update: { before: async (accountData) => ({ data: withoutAccountTokens(accountData) }) }
		},
		session: {
			create: {
				before: async (session, context) => {
					if (!isOidcCallback(context)) return;

					const now = new Date();
					await db.update(user).set({ role: 'admin' }).where(eq(user.id, session.userId));
					return {
						data: {
							...session,
							expiresAt: new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS),
							lastActiveAt: now
						}
					};
				}
			}
		}
	},
	plugins: [
		genericOAuth({
			config: [
				{
					providerId: OIDC_PROVIDER_ID,
					discoveryUrl: getOidcDiscoveryUrl(oidcIssuerUrl),
					requireIdTokenVerification: true,
					clientId: requiredEnv('OIDC_CLIENT_ID', OIDC_CLIENT_ID),
					clientSecret: requiredEnv('OIDC_CLIENT_SECRET', OIDC_CLIENT_SECRET),
					scopes: [...OIDC_SCOPES],
					overrideUserInfo: true,
					mapProfileToUser: async (profile) => {
						const subject = profile.sub ?? profile.id;
						if (typeof subject !== 'string' || !subject) {
							throw new Error('OIDC profile did not include a subject');
						}
						await bindFirstOidcAdmin(subject);
						return {};
					}
				}
			]
		}),
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

					return ctx.json({ success: true });
				})
			}
		},
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
