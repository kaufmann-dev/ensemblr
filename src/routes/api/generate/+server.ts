import { error } from '@sveltejs/kit';
import { requireUser } from '$lib/server/authz';
import { createGeneration, streamMixture } from '$lib/server/ai/engine';
import { getSettings } from '$lib/server/settings';
import { generateRequestSchema } from '$lib/validation';

function key(model: { providerId: string; modelId: string }) {
	return `${model.providerId}/${model.modelId}`;
}

export async function POST({ request, locals }) {
	const user = requireUser(locals);
	const parsed = generateRequestSchema.safeParse(await request.json());
	if (!parsed.success) error(400, 'Invalid generation request');

	if (user.role === 'demo') {
		const settings = await getSettings();
		const allowed = new Set(settings.demoAllowedModels.map(key));
		const selected = [...parsed.data.workers, parsed.data.judge];
		if (selected.some((model) => !allowed.has(key(model)))) {
			error(403, 'Demo users can only use admin-approved models');
		}
	}

	const generationId = await createGeneration(user.id, parsed.data);
	return new Response(streamMixture(user.id, generationId, parsed.data), {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			connection: 'keep-alive'
		}
	});
}
