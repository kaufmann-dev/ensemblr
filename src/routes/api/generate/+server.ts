import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { providerApiKey } from '$lib/server/db/schema';
import { requireUser } from '$lib/server/authz';
import { createGeneration, streamMixture } from '$lib/server/ai/engine';
import { getSettings } from '$lib/server/settings';
import { getRunnableModelKeys } from '$lib/server/models/catalog';
import { checkDemoGenerationRateLimit } from '$lib/server/demo-rate-limit';
import { generateRequestSchema } from '$lib/validation';

function key(model: { providerId: string; modelId: string }) {
	return `${model.providerId}/${model.modelId}`;
}

export async function POST({ request, locals, getClientAddress }) {
	const user = requireUser(locals);
	const parsed = generateRequestSchema.safeParse(await request.json());
	if (!parsed.success) error(400, 'Invalid generation request');

	const selected = [...parsed.data.workers, parsed.data.judge];
	if (user.role === 'demo') {
		const [settings, runnableModels] = await Promise.all([getSettings(), getRunnableModelKeys()]);
		const allowed = new Set(settings.demoAllowedModels.map(key));
		if (selected.some((model) => !allowed.has(key(model)) || !runnableModels.has(key(model)))) {
			error(403, 'Demo users can only use active admin-approved models');
		}

		const rateLimit = await checkDemoGenerationRateLimit(getClientAddress());
		if (!rateLimit.allowed) {
			return new Response(rateLimit.message, {
				status: 429,
				headers: { 'retry-after': rateLimit.retryAfterSeconds.toString() }
			});
		}
	} else {
		const keys = await db
			.select({ providerId: providerApiKey.providerId })
			.from(providerApiKey)
			.where(eq(providerApiKey.userId, user.id));
		const configuredProviders = new Set(keys.map((item) => item.providerId));
		if (selected.some((model) => !configuredProviders.has(model.providerId))) {
			error(403, 'Save an API key for each selected provider before running a generation');
		}
	}

	const generationId = await createGeneration(user, locals.session!.id, parsed.data);
	return new Response(streamMixture(user, generationId, parsed.data), {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
}
