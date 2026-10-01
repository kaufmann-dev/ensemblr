export const OIDC_PROVIDER_ID = 'oidc';
export const OIDC_CALLBACK_PATH = `/api/auth/callback/${OIDC_PROVIDER_ID}`;
export const OIDC_SCOPES = ['openid', 'profile', 'email'] as const;

function isLoopbackHostname(hostname: string) {
	const normalized = hostname.toLowerCase();
	return (
		normalized === 'localhost' ||
		normalized.endsWith('.localhost') ||
		normalized === '[::1]' ||
		/^127(?:\.\d{1,3}){3}$/.test(normalized)
	);
}

function parseOidcHttpUrl(name: string, value: string) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error(`${name} must be a valid absolute URL`);
	}

	if (!/^https?:\/\//i.test(value) || !['http:', 'https:'].includes(url.protocol)) {
		throw new Error(`${name} must use HTTP or HTTPS`);
	}
	const authorityAndPath = value.slice(value.indexOf('://') + 3);
	const authorityEnd = authorityAndPath.search(/[/?#\\]/);
	const authority =
		authorityEnd === -1 ? authorityAndPath : authorityAndPath.slice(0, authorityEnd);
	if (url.username || url.password || authority.includes('@')) {
		throw new Error(`${name} must not contain credentials`);
	}
	if (value.includes('?') || value.includes('#')) {
		throw new Error(`${name} must not contain a query or fragment`);
	}
	if (value.includes('\\')) throw new Error(`${name} must not contain backslashes`);
	if (url.protocol !== 'https:' && !isLoopbackHostname(url.hostname)) {
		throw new Error(`${name} must use HTTPS outside localhost`);
	}
	return url;
}

export function normalizeOidcIssuerUrl(value: string) {
	const issuer = parseOidcHttpUrl('OIDC_ISSUER_URL', value);
	return issuer.toString().replace(/\/$/, '');
}

export function normalizeApplicationOrigin(value: string) {
	const applicationUrl = parseOidcHttpUrl('ORIGIN', value);
	if (applicationUrl.pathname !== '/') throw new Error('ORIGIN must not contain a path');
	return applicationUrl.origin;
}

export function getOidcDiscoveryUrl(issuerUrl: string) {
	return `${normalizeOidcIssuerUrl(issuerUrl)}/.well-known/openid-configuration`;
}

/** Same-origin app path to resume after login; anything else falls back to the start page. */
export function safeReturnTo(value: string | null | undefined) {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
		return '/';
	}
	const url = new URL(value, 'http://return-to.invalid');
	if (url.origin !== 'http://return-to.invalid') return '/';
	if (url.pathname === '/login' || url.pathname.startsWith('/api/auth')) return '/';
	return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Strip provider access and refresh tokens before persisting an account. The ID token is kept
 * because Better Auth sends it as `id_token_hint` during RP-initiated logout.
 */
export function withoutAccountTokens<T extends Record<string, unknown>>(accountData: T) {
	return {
		...accountData,
		accessToken: null,
		refreshToken: null,
		accessTokenExpiresAt: null,
		refreshTokenExpiresAt: null
	};
}
