import assert from 'node:assert/strict';
import test from 'node:test';
import {
	SESSION_ABSOLUTE_LIFETIME_MS,
	SESSION_IDLE_TIMEOUT_MS,
	SESSION_TOUCH_HEADER,
	SESSION_TOUCH_HEADER_VALUE,
	getSessionExpiry,
	isSessionExpired,
	isUserDrivenRequest,
	shouldSendSessionTouch
} from '../session-policy.ts';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

test('caps a sliding idle session at seven days', () => {
	assert.equal(
		getSessionExpiry(createdAt, createdAt).toISOString(),
		new Date(createdAt.getTime() + SESSION_IDLE_TIMEOUT_MS).toISOString()
	);

	const nearAbsoluteLimit = new Date(createdAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS - 60_000);
	assert.equal(
		getSessionExpiry(createdAt, nearAbsoluteLimit).toISOString(),
		new Date(createdAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS).toISOString()
	);
});

test('expires sessions after either the idle or absolute deadline', () => {
	assert.equal(
		isSessionExpired(createdAt, createdAt, new Date(createdAt.getTime() + SESSION_IDLE_TIMEOUT_MS)),
		true
	);
	assert.equal(
		isSessionExpired(
			createdAt,
			new Date(createdAt.getTime() + 6 * SESSION_IDLE_TIMEOUT_MS),
			new Date(createdAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS)
		),
		true
	);
});

test('recognizes only an explicit same-origin interaction signal', () => {
	const origin = 'https://ensemblr.example.com';
	assert.equal(
		isUserDrivenRequest(
			new Request(`${origin}/auth/session/touch`, {
				method: 'POST',
				headers: {
					[SESSION_TOUCH_HEADER]: SESSION_TOUCH_HEADER_VALUE,
					origin,
					'sec-fetch-site': 'same-origin'
				}
			}),
			new URL(`${origin}/auth/session/touch`)
		),
		true
	);
});

test('does not refresh on navigation, mutation, background, cross-site, or malformed traffic', () => {
	const origin = 'https://ensemblr.example.com';
	const passiveRequests = [
		new Request(`${origin}/api/generations/1/events`, {
			headers: { accept: 'text/event-stream' }
		}),
		new Request(`${origin}/history`, {
			headers: { accept: 'text/html', 'sec-fetch-dest': 'document', purpose: 'prefetch' }
		}),
		new Request(`${origin}/api/generate`, {
			method: 'POST',
			headers: { origin, 'sec-fetch-site': 'same-origin' }
		}),
		new Request(`${origin}/api/auth/get-session`, { method: 'POST' }),
		new Request(`${origin}/logout`, { method: 'POST' }),
		new Request(`${origin}/auth/session/touch`, { method: 'POST' }),
		new Request(`${origin}/auth/session/touch`, {
			method: 'POST',
			headers: {
				[SESSION_TOUCH_HEADER]: SESSION_TOUCH_HEADER_VALUE,
				origin: 'https://attacker.example.com',
				'sec-fetch-site': 'cross-site'
			}
		})
	];

	for (const request of passiveRequests) {
		assert.equal(isUserDrivenRequest(request, new URL(request.url)), false);
	}
});

test('throttles trusted browser interaction signals', () => {
	assert.equal(shouldSendSessionTouch(true, 1_000, -Infinity), true);
	assert.equal(shouldSendSessionTouch(false, 1_000, -Infinity), false);
	assert.equal(shouldSendSessionTouch(true, 1_001, 1_000), false);
});
