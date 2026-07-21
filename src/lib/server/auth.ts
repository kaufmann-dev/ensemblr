import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthEndpoint, APIError } from 'better-auth/api';
import { getCookies, setSessionCookie } from 'better-auth/cookies';
import { genericOAuth } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import {
	bindFirstOidcAdmin,
	consumeOidcIdToken,
	getOidcCallbackState,
	getOidcUserInfo,
	stageOidcIdToken
} from '$lib/server/oidc';
import {
	OIDC_PROVIDER_ID,
	OIDC_SCOPES,
	getOidcDiscoveryUrl,
	normalizeApplicationOrigin,
	normalizeOidcIssuerUrl,
	withoutAccountTokens
} from '$lib/oidc-policy';
import { SESSION_IDLE_TIMEOUT_MS } from '$lib/session-policy';

function requiredEnv(
	name:
		| 'ORIGIN'
		| 'BETTER_AUTH_SECRET'
		| 'OIDC_ISSUER_URL'
		| 'OIDC_CLIENT_ID'
		| 'OIDC_CLIENT_SECRET'
) {
	const value = env[name];
	if (!value) throw new Error(`${name} is required`);
	return value;
}

const origin = normalizeApplicationOrigin(requiredEnv('ORIGIN'));
const oidcIssuerUrl = normalizeOidcIssuerUrl(requiredEnv('OIDC_ISSUER_URL'));

export const authSessionCookie = getCookies({
	baseURL: origin,
	session: { expiresIn: SESSION_IDLE_TIMEOUT_MS / 1000 }
}).sessionToken;

async function stageAccountIdToken(
	accountData: Record<string, unknown>,
	context: Parameters<typeof getOidcCallbackState>[0]
) {
	const state = getOidcCallbackState(context);
	if (!state) return;
	if (typeof accountData.idToken !== 'string' || !accountData.idToken) {
		throw new APIError('BAD_REQUEST', {
			message: 'OIDC token response did not include an ID token'
		});
	}

	await stageOidcIdToken(state, accountData.idToken);
	return { data: withoutAccountTokens(accountData) };
}

export const auth = betterAuth({
	baseURL: origin,
	secret: requiredEnv('BETTER_AUTH_SECRET'),
	database: drizzleAdapter(db, { provider: 'pg' }),
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
			},
			idTokenHint: {
				type: 'string',
				required: false,
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
			create: {
				before: (accountData, context) => stageAccountIdToken(accountData, context)
			},
			update: {
				before: (accountData, context) => stageAccountIdToken(accountData, context)
			}
		},
		session: {
			create: {
				before: async (session, context) => {
					const state = getOidcCallbackState(context);
					if (!state) return;
					const idTokenHint = await consumeOidcIdToken(state);
					if (!idTokenHint) {
						throw new APIError('BAD_REQUEST', { message: 'OIDC login state expired' });
					}

					const now = new Date();
					await db.update(user).set({ role: 'admin' }).where(eq(user.id, session.userId));
					return {
						data: {
							...session,
							expiresAt: new Date(now.getTime() + SESSION_IDLE_TIMEOUT_MS),
							lastActiveAt: now,
							idTokenHint
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
					issuer: oidcIssuerUrl,
					clientId: requiredEnv('OIDC_CLIENT_ID'),
					clientSecret: requiredEnv('OIDC_CLIENT_SECRET'),
					scopes: [...OIDC_SCOPES],
					responseType: 'code',
					authentication: 'post',
					pkce: true,
					overrideUserInfo: true,
					getUserInfo: (tokens) => getOidcUserInfo(oidcIssuerUrl, tokens.accessToken),
					mapProfileToUser: async (profile) => {
						const subject = typeof profile.id === 'string' ? profile.id : undefined;
						if (!subject) throw new Error('OIDC userinfo did not include a subject');
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
