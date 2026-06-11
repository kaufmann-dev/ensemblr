import { and, eq } from 'drizzle-orm';
import { streamText } from 'ai';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import {
	generation,
	generationOutput,
	providerApiKey,
	type ModelSelection
} from '$lib/server/db/schema';
import { decryptSecret } from '$lib/server/crypto';
import { findCatalogModel } from '$lib/server/models/catalog';
import { getSettings } from '$lib/server/settings';
import { createLanguageModel } from './providers';
import { publishGenerationEvent, sse, startGeneration, type RunEvent } from './generation-events';
import type { GenerateRequest } from '$lib/validation';

type SuccessfulAnswer = {
	model: ModelSelection;
	text: string;
};

type RunUser = Pick<NonNullable<App.Locals['user']>, 'id' | 'role'>;

function renderTemplate(template: string, prompt: string, answers: SuccessfulAnswer[]) {
	return template
		.replaceAll('{{original_prompt}}', prompt)
		.replaceAll(
			'{{previous_answers}}',
			answers
				.map((answer) => `${answer.model.providerId}/${answer.model.modelId}:\n${answer.text}`)
				.join('\n\n')
		);
}

async function getApiKey(
	user: RunUser,
	provider: NonNullable<Awaited<ReturnType<typeof findCatalogModel>>>['provider']
) {
	const [key] = await db
		.select()
		.from(providerApiKey)
		.where(and(eq(providerApiKey.userId, user.id), eq(providerApiKey.providerId, provider.id)))
		.limit(1);

	if (key) return decryptSecret(key.encryptedKey);

	if (user.role === 'demo') {
		const managedKey = provider.env?.map((name) => env[name]).find(Boolean);
		if (managedKey) return managedKey;
		throw new Error(`No admin-managed API key configured for ${provider.name}`);
	}

	throw new Error(`No API key saved for ${provider.name}`);
}

async function runModel(
	user: RunUser,
	generationId: string,
	phase: 'worker' | 'judge',
	round: number,
	model: ModelSelection,
	prompt: string,
	options: GenerateRequest['options'],
	emit: (event: RunEvent) => void
): Promise<SuccessfulAnswer | undefined> {
	const outputId = crypto.randomUUID();
	await db.insert(generationOutput).values({
		id: outputId,
		generationId,
		phase,
		round,
		providerId: model.providerId,
		modelId: model.modelId,
		status: 'running',
		output: ''
	});
	emit({ type: 'status', outputId, phase, round, model, status: 'running' });

	try {
		const catalog = await findCatalogModel(model.providerId, model.modelId);
		if (!catalog?.provider.enabled) throw new Error('Inference is not enabled for this provider');

		const apiKey = await getApiKey(user, catalog.provider);
		const languageModel = createLanguageModel(catalog.provider, model.modelId, apiKey);
		const result = streamText({
			model: languageModel,
			prompt,
			maxOutputTokens: options?.maxOutputTokens
		});

		let text = '';
		for await (const delta of result.textStream) {
			text += delta;
			emit({ type: 'text', outputId, phase, round, model, text: delta });
		}

		if (text.trim().length === 0) throw new Error('Model returned an empty response');

		await db
			.update(generationOutput)
			.set({ status: 'completed', output: text })
			.where(eq(generationOutput.id, outputId));
		emit({ type: 'status', outputId, phase, round, model, status: 'completed' });
		return { model, text };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Generation failed';
		await db
			.update(generationOutput)
			.set({ status: 'failed', error: message })
			.where(eq(generationOutput.id, outputId));
		emit({ type: 'error', outputId, phase, round, model, error: message });
		return undefined;
	}
}

export async function createGeneration(user: RunUser, sessionId: string, request: GenerateRequest) {
	const generationId = crypto.randomUUID();
	const now = new Date();
	await db.insert(generation).values({
		id: generationId,
		userId: user.id,
		demoSessionId: user.role === 'demo' ? sessionId : null,
		prompt: request.prompt,
		config: request,
		status: 'running'
	});
	startGeneration({
		generation: {
			id: generationId,
			userId: user.id,
			demoSessionId: user.role === 'demo' ? sessionId : null,
			prompt: request.prompt,
			status: 'running',
			finalOutput: null,
			error: null,
			createdAt: now,
			updatedAt: now
		},
		outputs: []
	});
	return generationId;
}

export function streamMixture(user: RunUser, generationId: string, request: GenerateRequest) {
	const encoder = new TextEncoder();

	return new ReadableStream({
		async start(controller) {
			let closed = false;
			const emit = (event: RunEvent) => {
				publishGenerationEvent(generationId, event);
				if (closed) return;
				try {
					controller.enqueue(encoder.encode(sse(event)));
				} catch {
					closed = true;
				}
			};
			emit({ type: 'generation', generationId });

			try {
				const settings = await getSettings();
				let answers = (
					await Promise.all(
						request.workers.map((worker) =>
							runModel(
								user,
								generationId,
								'worker',
								0,
								worker,
								request.prompt,
								request.options,
								emit
							)
						)
					)
				).filter((answer): answer is SuccessfulAnswer => Boolean(answer));

				for (let round = 1; round <= request.rounds && answers.length > 0; round += 1) {
					if (closed) break; // Stop executing further rounds if browser connection dropped
					const roundPrompt = renderTemplate(
						settings.intermediateTemplate,
						request.prompt,
						answers
					);
					answers = (
						await Promise.all(
							answers.map((answer) =>
								runModel(
									user,
									generationId,
									'worker',
									round,
									answer.model,
									roundPrompt,
									request.options,
									emit
								)
							)
						)
					).filter((answer): answer is SuccessfulAnswer => Boolean(answer));
				}

				if (closed) return; // Stop executing final judge if browser connection dropped
				if (answers.length === 0) throw new Error('All worker models failed');

				const judgePrompt = renderTemplate(settings.judgeTemplate, request.prompt, answers);
				const final = await runModel(
					user,
					generationId,
					'judge',
					request.rounds + 1,
					request.judge,
					judgePrompt,
					request.options,
					emit
				);

				if (!final) throw new Error('Judge model failed');

				await db
					.update(generation)
					.set({ status: 'completed', finalOutput: final.text })
					.where(eq(generation.id, generationId));
				emit({ type: 'final', generationId, text: final.text });
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Generation failed';
				await db
					.update(generation)
					.set({ status: 'failed', error: message })
					.where(eq(generation.id, generationId));
				emit({
					type: 'error',
					phase: 'judge',
					round: request.rounds + 1,
					model: request.judge,
					error: message
				});
			} finally {
				if (!closed) {
					closed = true;
					try {
						controller.close();
					} catch {
						// Stream is already closed by SvelteKit or the browser, completely safe to ignore
					}
				}
			}
		}
	});
}
