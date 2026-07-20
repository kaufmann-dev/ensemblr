import assert from 'node:assert/strict';
import test from 'node:test';
import {
	OIDC_CALLBACK_PATH,
	OIDC_SCOPES,
	getOidcDiscoveryUrl,
	getOidcPostLogoutRedirectUrl,
	normalizeApplicationOrigin,
	normalizeOidcIssuerUrl,
	withoutAccountTokens
} from './oidc-policy.ts';

test('uses the fixed OIDC callback and minimum interactive scopes', () => {
	assert.equal(OIDC_CALLBACK_PATH, '/api/auth/oauth2/callback/oidc');
	assert.deepEqual(OIDC_SCOPES, ['openid', 'profile', 'email']);
	assert.equal(OIDC_SCOPES.includes('offline_access' as never), false);
});

test('derives discovery and post-logout URLs from configured public URLs', () => {
	assert.equal(
		normalizeOidcIssuerUrl('https://id.example.com/realm/'),
		'https://id.example.com/realm'
	);
	assert.equal(
		getOidcDiscoveryUrl('https://id.example.com/realm/'),
		'https://id.example.com/realm/.well-known/openid-configuration'
	);
	assert.equal(
		getOidcPostLogoutRedirectUrl('https://ensemblr.example.com'),
		'https://ensemblr.example.com/login'
	);
	assert.throws(() => normalizeOidcIssuerUrl('https://id.example.com/?tenant=one'));
	assert.throws(() => normalizeOidcIssuerUrl('https://id.example.com/#issuer'));
	assert.throws(() => normalizeOidcIssuerUrl('http://id.example.com'));
	assert.throws(() => normalizeOidcIssuerUrl('https://@id.example.com'));
	assert.throws(() => normalizeOidcIssuerUrl('https:\\id.example.com'));
	assert.equal(
		normalizeOidcIssuerUrl('http://localhost:8080/realm/'),
		'http://localhost:8080/realm'
	);
	assert.equal(
		normalizeApplicationOrigin('https://ensemblr.example.com/'),
		'https://ensemblr.example.com'
	);
	assert.throws(() => normalizeApplicationOrigin('https://ensemblr.example.com/app'));
});

test('removes every provider token before account persistence', () => {
	assert.deepEqual(
		withoutAccountTokens({
			providerId: 'oidc',
			accountId: 'subject',
			accessToken: 'access',
			refreshToken: 'refresh',
			idToken: 'id',
			accessTokenExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
			refreshTokenExpiresAt: new Date('2026-01-02T00:00:00.000Z')
		}),
		{
			providerId: 'oidc',
			accountId: 'subject',
			accessToken: null,
			refreshToken: null,
			idToken: null,
			accessTokenExpiresAt: null,
			refreshTokenExpiresAt: null
		}
	);
});
