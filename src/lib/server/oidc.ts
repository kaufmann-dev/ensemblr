import { createHash, randomUUID } from 'node:crypto';
import { and, eq, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { account, oidcLoginState, user } from '$lib/server/db/schema';
import { OIDC_PROVIDER_ID, getOidcDiscoveryUrl, normalizeOidcIssuerUrl } from '$lib/oidc-policy';

const LOGIN_STATE_LIFETIME_MS = 10 * 60 * 1000;
const FIRST_ADMIN_LOCK = 'ensemblr:first-oidc-admin';

const oidcMetadataSchema = z.object({
	issuer: z.url(),
	authorization_endpoint: z.url(),
	token_endpoint: z.url(),
	userinfo_endpoint: z.url(),
	end_session_endpoint: z.url()
});

const oidcUserInfoSchema = z.object({
	sub: z.string().min(1),
	email: z.email(),
	email_verified: z.boolean().optional(),
	name: z.string().min(1).optional(),
	preferred_username: z.string().min(1).optional(),
	picture: z.url().optional()
});

type OidcMetadata = z.infer<typeof oidcMetadataSchema>;
type AuthHookContext = {
	path?: string;
	query?: unknown;
} | null;

let metadataPromise: Promise<OidcMetadata> | undefined;

export async function getOidcMetadata(issuerUrl: string) {
	metadataPromise ??= (async () => {
		const expectedIssuer = normalizeOidcIssuerUrl(issuerUrl);
		const response = await fetch(getOidcDiscoveryUrl(expectedIssuer), {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout(10_000)
		});
		if (!response.ok) throw new Error(`OIDC discovery failed with status ${response.status}`);

		const metadata = oidcMetadataSchema.parse(await response.json());
		if (normalizeOidcIssuerUrl(metadata.issuer) !== expectedIssuer) {
			throw new Error('OIDC discovery returned an unexpected issuer');
		}
		return metadata;
	})();

	try {
		return await metadataPromise;
	} catch (error) {
		metadataPromise = undefined;
		throw error;
	}
}

export async function getOidcUserInfo(issuerUrl: string, accessToken: string | undefined) {
	if (!accessToken) throw new Error('OIDC token response did not include an access token');
	const metadata = await getOidcMetadata(issuerUrl);
	const response = await fetch(metadata.userinfo_endpoint, {
		headers: {
			accept: 'application/json',
			authorization: `Bearer ${accessToken}`
		},
		signal: AbortSignal.timeout(10_000)
	});
	if (!response.ok) throw new Error(`OIDC userinfo failed with status ${response.status}`);

	const profile = oidcUserInfoSchema.parse(await response.json());
	return {
		id: profile.sub,
		email: profile.email,
		emailVerified: profile.email_verified ?? false,
		name: profile.name ?? profile.preferred_username ?? profile.email,
		image: profile.picture
	};
}

export async function bindFirstOidcAdmin(subject: string) {
	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${FIRST_ADMIN_LOCK}))`);

		const [existingIdentity] = await tx
			.select({ id: account.id })
			.from(account)
			.where(and(eq(account.providerId, OIDC_PROVIDER_ID), eq(account.accountId, subject)))
			.limit(1);
		if (existingIdentity) return;

		const [existingOidcAccount] = await tx
			.select({ id: account.id })
			.from(account)
			.where(eq(account.providerId, OIDC_PROVIDER_ID))
			.limit(1);
		if (existingOidcAccount) return;

		const admins = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.role, 'admin'))
			.limit(2);
		if (admins.length !== 1) return;

		const now = new Date();
		await tx.insert(account).values({
			id: randomUUID(),
			accountId: subject,
			providerId: OIDC_PROVIDER_ID,
			userId: admins[0].id,
			createdAt: now,
			updatedAt: now
		});
	});
}

export function getOidcCallbackState(context: AuthHookContext) {
	if (context?.path !== `/oauth2/callback/${OIDC_PROVIDER_ID}`) return undefined;
	if (!context.query || typeof context.query !== 'object' || !('state' in context.query)) {
		return undefined;
	}
	const state = context.query.state;
	return typeof state === 'string' && state.length > 0 ? state : undefined;
}

function hashLoginState(state: string) {
	return createHash('sha256').update(state).digest('hex');
}

export async function stageOidcIdToken(state: string, idTokenHint: string) {
	const now = new Date();
	await db.transaction(async (tx) => {
		await tx.delete(oidcLoginState).where(lt(oidcLoginState.expiresAt, now));
		await tx
			.insert(oidcLoginState)
			.values({
				stateHash: hashLoginState(state),
				idTokenHint,
				expiresAt: new Date(now.getTime() + LOGIN_STATE_LIFETIME_MS)
			})
			.onConflictDoUpdate({
				target: oidcLoginState.stateHash,
				set: {
					idTokenHint,
					expiresAt: new Date(now.getTime() + LOGIN_STATE_LIFETIME_MS)
				}
			});
	});
}

export async function consumeOidcIdToken(state: string) {
	const now = new Date();
	return db.transaction(async (tx) => {
		await tx.delete(oidcLoginState).where(lt(oidcLoginState.expiresAt, now));
		const [pending] = await tx
			.delete(oidcLoginState)
			.where(eq(oidcLoginState.stateHash, hashLoginState(state)))
			.returning({ idTokenHint: oidcLoginState.idTokenHint });
		return pending?.idTokenHint;
	});
}

export async function getOidcLogoutUrl(
	issuerUrl: string,
	idTokenHint: string,
	postLogoutRedirectUri: string
) {
	const metadata = await getOidcMetadata(issuerUrl);
	const logoutUrl = new URL(metadata.end_session_endpoint);
	logoutUrl.searchParams.set('id_token_hint', idTokenHint);
	logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
	return logoutUrl;
}
