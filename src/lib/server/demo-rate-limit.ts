import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { demoGenerationRateLimit } from '$lib/server/db/schema';
import { getSettings } from '$lib/server/settings';

type RateLimitScope = 'ip' | 'global';

type RateLimitResult =
	| { allowed: true }
	| { allowed: false; message: string; retryAfterSeconds: number };

function windowStart(now: Date, windowMs: number) {
	return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

async function incrementCounter(
	scope: RateLimitScope,
	identifier: string,
	window: Date,
	limit: number
) {
	const [row] = await db
		.insert(demoGenerationRateLimit)
		.values({ scope, identifier, windowStart: window, count: 1 })
		.onConflictDoUpdate({
			target: [
				demoGenerationRateLimit.scope,
				demoGenerationRateLimit.identifier,
				demoGenerationRateLimit.windowStart
			],
			set: {
				count: sql`${demoGenerationRateLimit.count} + 1`,
				updatedAt: new Date()
			}
		})
		.returning({ count: demoGenerationRateLimit.count });

	return row.count <= limit;
}

export async function checkDemoGenerationRateLimit(clientAddress: string): Promise<RateLimitResult> {
	const settings = await getSettings();
	const now = new Date();
	const windowMs = settings.demoRateLimitWindowMinutes * 60 * 1000;
	const window = windowStart(now, windowMs);
	const retryAfterSeconds = Math.ceil((window.getTime() + windowMs - now.getTime()) / 1000);

	const ipAllowed = await incrementCounter('ip', clientAddress, window, settings.demoRateLimitPerIp);
	if (!ipAllowed) {
		return {
			allowed: false,
			message: `Demo generation limit reached for this IP address. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
			retryAfterSeconds
		};
	}

	const globalAllowed = await incrementCounter('global', 'all', window, settings.demoRateLimitGlobal);
	if (!globalAllowed) {
		return {
			allowed: false,
			message: `Global demo generation limit reached. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
			retryAfterSeconds
		};
	}

	return { allowed: true };
}
