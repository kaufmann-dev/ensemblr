import { and, asc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { generation, generationOutput } from '$lib/server/db/schema';
import { visibleGenerationsFor } from '$lib/server/generation-access';
import { requireUser } from '$lib/server/authz';
import {
	getLiveGenerationSnapshot,
	sse,
	subscribeToGeneration,
	type GenerationSnapshot,
	type GenerationStreamEvent
} from '$lib/server/ai/generation-events';

async function loadSnapshot(
	id: string,
	user: NonNullable<App.Locals['user']>,
	sessionId: string
): Promise<GenerationSnapshot | undefined> {
	const [item] = await db
		.select()
		.from(generation)
		.where(and(eq(generation.id, id), visibleGenerationsFor(user, sessionId)))
		.limit(1);

	if (!item) return undefined;

	const outputs = await db
		.select()
		.from(generationOutput)
		.where(eq(generationOutput.generationId, item.id))
		.orderBy(
			asc(generationOutput.round),
			asc(generationOutput.phase),
			asc(generationOutput.createdAt)
		);

	return { type: 'snapshot', generation: item, outputs };
}

export async function GET({ locals, params, request }) {
	const user = requireUser(locals);
	const sessionId = locals.session!.id;
	const liveSnapshot = getLiveGenerationSnapshot(params.id);
	const snapshot = liveSnapshot ?? (await loadSnapshot(params.id, user, sessionId));

	if (!snapshot) error(404, 'Generation not found');

	const encoder = new TextEncoder();

	return new Response(
		new ReadableStream({
			start(controller) {
				let closed = false;
				let unsubscribe = () => {};
				let poll: ReturnType<typeof setInterval> | undefined;

				const close = () => {
					if (closed) return;
					closed = true;
					unsubscribe();
					if (poll) clearInterval(poll);
					try {
						controller.close();
					} catch {
						// Stream is already closed by SvelteKit or the browser, completely safe to ignore
					}
				};

				const send = (event: GenerationStreamEvent) => {
					if (closed) return;
					try {
						controller.enqueue(encoder.encode(sse(event)));
					} catch {
						close();
						return;
					}
					if (
						event.type === 'final' ||
						(event.type === 'error' && !event.outputId) ||
						(event.type === 'snapshot' && event.generation.status !== 'running')
					) {
						close();
					}
				};

				if (liveSnapshot && snapshot.generation.status === 'running') {
					unsubscribe = subscribeToGeneration(params.id, send);
				}
				send(snapshot);
				if (snapshot.generation.status !== 'running') return;

				if (!liveSnapshot) {
					poll = setInterval(async () => {
						try {
							const next = await loadSnapshot(params.id, user, sessionId);
							if (next) send(next);
						} catch {
							close();
						}
					}, 1000);
				}

				request.signal.addEventListener('abort', close, { once: true });
			}
		}),
		{
			headers: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				connection: 'keep-alive'
			}
		}
	);
}
