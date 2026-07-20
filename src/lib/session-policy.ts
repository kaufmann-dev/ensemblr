export const SESSION_IDLE_TIMEOUT_MS = 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TOUCH_PATH = '/auth/session/touch';
export const SESSION_TOUCH_HEADER = 'x-ensemblr-user-interaction';
export const SESSION_TOUCH_HEADER_VALUE = '1';
export const SESSION_TOUCH_THROTTLE_MS = 5 * 60 * 1000;

export function getAbsoluteSessionExpiry(createdAt: Date) {
	return new Date(createdAt.getTime() + SESSION_ABSOLUTE_LIFETIME_MS);
}

export function getIdleSessionExpiry(lastActiveAt: Date) {
	return new Date(lastActiveAt.getTime() + SESSION_IDLE_TIMEOUT_MS);
}

export function getSessionExpiry(createdAt: Date, lastActiveAt: Date) {
	const absoluteExpiry = getAbsoluteSessionExpiry(createdAt);
	const idleExpiry = getIdleSessionExpiry(lastActiveAt);
	return absoluteExpiry < idleExpiry ? absoluteExpiry : idleExpiry;
}

export function isSessionExpired(createdAt: Date, lastActiveAt: Date, now = new Date()) {
	return getSessionExpiry(createdAt, lastActiveAt) <= now;
}

export function isUserDrivenRequest(request: Request, url: URL) {
	if (request.method !== 'POST' || url.pathname !== SESSION_TOUCH_PATH) return false;
	if (request.headers.get(SESSION_TOUCH_HEADER) !== SESSION_TOUCH_HEADER_VALUE) return false;
	if (request.headers.get('origin') !== url.origin) return false;
	const fetchSite = request.headers.get('sec-fetch-site');
	return fetchSite === null || fetchSite === 'same-origin';
}

export function shouldSendSessionTouch(isTrusted: boolean, now: number, lastSentAt: number) {
	return isTrusted && now - lastSentAt >= SESSION_TOUCH_THROTTLE_MS;
}
