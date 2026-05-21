import type { ModelSelection } from '$lib/server/db/schema';

export type GenerationStatus = 'running' | 'completed' | 'failed';

export type RunEvent =
	| { type: 'generation'; generationId: string }
	| {
			type: 'status';
			outputId: string;
			phase: 'worker' | 'judge';
			round: number;
			model: ModelSelection;
			status: GenerationStatus;
	  }
	| {
			type: 'text';
			outputId: string;
			phase: 'worker' | 'judge';
			round: number;
			model: ModelSelection;
			text: string;
	  }
	| {
			type: 'error';
			outputId?: string;
			phase: 'worker' | 'judge';
			round: number;
			model: ModelSelection;
			error: string;
	  }
	| { type: 'final'; generationId: string; text: string };

export type LiveGeneration = {
	id: string;
	userId: string;
	demoSessionId: string | null;
	prompt: string;
	status: GenerationStatus;
	finalOutput: string | null;
	error: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type LiveGenerationOutput = {
	id: string;
	generationId: string;
	phase: 'worker' | 'judge';
	round: number;
	providerId: string;
	modelId: string;
	status: GenerationStatus;
	output: string;
	error: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export type GenerationSnapshot = {
	type: 'snapshot';
	generation: LiveGeneration;
	outputs: LiveGenerationOutput[];
};

export type GenerationStreamEvent = GenerationSnapshot | RunEvent;

type LiveRun = GenerationSnapshot & {
	subscribers: Set<(event: GenerationStreamEvent) => void>;
	cleanup?: ReturnType<typeof setTimeout>;
};

const liveRuns = new Map<string, LiveRun>();

function cloneSnapshot(run: GenerationSnapshot): GenerationSnapshot {
	return {
		type: 'snapshot',
		generation: { ...run.generation },
		outputs: run.outputs.map((output) => ({ ...output }))
	};
}

function terminal(status: GenerationStatus) {
	return status === 'completed' || status === 'failed';
}

function findOutput(run: LiveRun, event: Extract<RunEvent, { outputId: string }>) {
	let output = run.outputs.find((item) => item.id === event.outputId);
	if (!output) {
		const now = new Date();
		output = {
			id: event.outputId,
			generationId: run.generation.id,
			phase: event.phase,
			round: event.round,
			providerId: event.model.providerId,
			modelId: event.model.modelId,
			status: 'running',
			output: '',
			error: null,
			createdAt: now,
			updatedAt: now
		};
		run.outputs.push(output);
	}
	return output;
}

function applyEvent(run: LiveRun, event: RunEvent) {
	const now = new Date();
	run.generation.updatedAt = now;

	if (event.type === 'status') {
		const output = findOutput(run, event);
		output.status = event.status;
		output.updatedAt = now;
		return;
	}

	if (event.type === 'text') {
		const output = findOutput(run, event);
		output.output += event.text;
		output.updatedAt = now;
		if (event.phase === 'judge') {
			run.generation.finalOutput = `${run.generation.finalOutput ?? ''}${event.text}`;
		}
		return;
	}

	if (event.type === 'error') {
		if (event.outputId) {
			const output = findOutput(run, {
				...event,
				outputId: event.outputId,
				status: 'failed',
				type: 'status'
			});
			output.status = 'failed';
			output.error = event.error;
			output.updatedAt = now;
		} else {
			run.generation.status = 'failed';
			run.generation.error = event.error;
		}
		return;
	}

	if (event.type === 'final') {
		run.generation.status = 'completed';
		run.generation.finalOutput = event.text;
	}
}

export function sse(event: GenerationStreamEvent) {
	return `data: ${JSON.stringify(event)}\n\n`;
}

export function startGeneration(snapshot: Omit<GenerationSnapshot, 'type'>) {
	const existing = liveRuns.get(snapshot.generation.id);
	if (existing?.cleanup) clearTimeout(existing.cleanup);
	liveRuns.set(snapshot.generation.id, {
		type: 'snapshot',
		generation: { ...snapshot.generation },
		outputs: snapshot.outputs.map((output) => ({ ...output })),
		subscribers: existing?.subscribers ?? new Set()
	});
}

export function publishGenerationEvent(generationId: string, event: RunEvent) {
	const run = liveRuns.get(generationId);
	if (!run) return;

	applyEvent(run, event);
	for (const subscriber of run.subscribers) subscriber(event);

	if (terminal(run.generation.status)) {
		run.cleanup = setTimeout(() => {
			liveRuns.delete(generationId);
		}, 60_000);
	}
}

export function getLiveGenerationSnapshot(generationId: string) {
	const run = liveRuns.get(generationId);
	return run ? cloneSnapshot(run) : undefined;
}

export function subscribeToGeneration(
	generationId: string,
	subscriber: (event: GenerationStreamEvent) => void
) {
	const run = liveRuns.get(generationId);
	if (!run) return () => {};

	run.subscribers.add(subscriber);
	return () => {
		run.subscribers.delete(subscriber);
	};
}
