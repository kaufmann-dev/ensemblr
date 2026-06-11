<script lang="ts">
	import AssistantMessage from '$lib/components/conversation/AssistantMessage.svelte';
	import UserMessage from '$lib/components/conversation/UserMessage.svelte';
	import MixtureConfig from '$lib/components/MixtureConfig.svelte';
	import MixtureSteps, { type MixtureStep } from '$lib/components/MixtureSteps.svelte';
	import PromptInput from '$lib/components/PromptInput.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getHistoryContext } from '$lib/history/history.svelte';
	import { ArrowUp, Loader2, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const history = getHistoryContext();

	type Selection = { providerId: string; modelId: string };
	type WorkerSelection = { id: string; value: string };
	type Conversation = {
		prompt: string;
		final: string;
		generationId: string;
		error?: string;
	};

	let prompt = $state('');
	let workers = $state<WorkerSelection[]>([
		{ id: 'worker-1', value: '' },
		{ id: 'worker-2', value: '' },
		{ id: 'worker-3', value: '' },
		{ id: 'worker-4', value: '' }
	]);
	let judgeId = $state('');
	let rounds = $state(1);
	let running = $state(false);
	let conversation = $state<Conversation | undefined>();
	let outputs = $state<MixtureStep[]>([]);

	let workerSteps = $derived(outputs.filter((output) => output.phase === 'worker'));

	let hasModelOptions = $derived(data.catalog.some((provider) => provider.models.length > 0));
	let selectedWorkers = $derived(workers.filter((worker) => worker.value));
	let emptyModelsMessage = $derived(
		data.userRole === 'demo'
			? 'No demo models are currently enabled.'
			: data.keyProviders.length === 0
				? 'Add an API key before selecting models.'
				: 'None of your saved providers currently have enabled models.'
	);
	let disabledReason = $derived.by(() => {
		if (running) return 'A generation is already running.';
		if (!hasModelOptions) return emptyModelsMessage;
		const missing: string[] = [];
		if (!prompt.trim()) missing.push('enter a prompt');
		if (selectedWorkers.length < 2) missing.push('select at least two worker models');
		if (!judgeId) missing.push('select a judge model');
		if (missing.length === 0) return '';
		const sentence = missing.join(', ').replace(/, ([^,]*)$/, ' and $1');
		return `To generate, ${sentence}.`;
	});
	let canRun = $derived(!disabledReason);

	// "New generation" pressed while already on this page: reset the workspace.
	let lastResetSignal = history.resetSignal;
	$effect(() => {
		if (history.resetSignal === lastResetSignal) return;
		lastResetSignal = history.resetSignal;
		conversation = undefined;
		outputs = [];
		prompt = '';
	});

	function parseSelection(value: string): Selection {
		const [providerId, ...model] = value.split('/');
		return { providerId, modelId: model.join('/') };
	}

	function upsertOutput(event: {
		outputId?: string;
		phase: 'worker' | 'judge';
		round: number;
		model: Selection;
		status?: string;
		text?: string;
		error?: string;
	}) {
		const key =
			event.outputId ??
			`${event.phase}:${event.round}:${event.model.providerId}/${event.model.modelId}`;
		const existing = outputs.find((item) => item.key === key);
		if (existing) {
			existing.status = event.status ?? existing.status;
			existing.text += event.text ?? '';
			existing.error = event.error ?? existing.error;
			return;
		}
		outputs.push({
			key,
			phase: event.phase,
			round: event.round,
			providerId: event.model.providerId,
			modelId: event.model.modelId,
			status: event.status ?? 'running',
			text: event.text ?? '',
			error: event.error
		});
	}

	async function run() {
		if (!canRun) return;

		const submittedPrompt = prompt.trim();
		conversation = { prompt: submittedPrompt, final: '', generationId: '' };
		outputs = [];
		prompt = '';
		running = true;

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					prompt: submittedPrompt,
					workers: selectedWorkers.map((worker) => parseSelection(worker.value)),
					judge: parseSelection(judgeId),
					rounds
				})
			});

			if (!response.ok || !response.body) {
				const message = await response.text();
				if (response.status === 429) {
					const retryAfterSeconds = Number(response.headers.get('retry-after'));
					const retryAfterMinutes = Number.isFinite(retryAfterSeconds)
						? Math.max(1, Math.ceil(retryAfterSeconds / 60))
						: null;
					conversation.error = retryAfterMinutes
						? `Demo rate limit reached. No provider API call was started. Try again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`
						: 'Demo rate limit reached. No provider API call was started. Try again after the current rate-limit window resets.';
				} else {
					conversation.error = message || 'Generation could not start.';
				}
				return;
			}

			const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
			let buffer = '';
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += value;
				const events = buffer.split('\n\n');
				buffer = events.pop() ?? '';
				for (const chunk of events) {
					const line = chunk.split('\n').find((item) => item.startsWith('data: '));
					if (!line) continue;
					const event = JSON.parse(line.slice(6));
					if (event.type === 'generation') {
						conversation.generationId = event.generationId;
						history.upsert({
							id: event.generationId,
							prompt: submittedPrompt,
							status: 'running',
							createdAt: new Date()
						});
					}
					if (event.type === 'status') upsertOutput(event);
					if (event.type === 'text') {
						upsertOutput(event);
						if (event.phase === 'judge') conversation.final += event.text;
					}
					if (event.type === 'error') {
						upsertOutput({ ...event, status: 'failed' });
						if (!event.outputId) {
							conversation.error = event.error;
							if (conversation.generationId) {
								history.setStatus(conversation.generationId, 'failed');
							}
						}
					}
					if (event.type === 'final') {
						conversation.final = event.text;
						history.setStatus(event.generationId, 'completed');
					}
				}
			}
		} catch {
			if (conversation) conversation.error = 'Generation could not be started. Try again.';
		} finally {
			running = false;
		}
	}
</script>

<svelte:head><title>Workspace | ensemblr</title></svelte:head>

<main class="flex min-h-0 flex-1 flex-col">
	<div class="min-h-0 flex-1 overflow-y-auto">
		<div class="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
			{#if conversation}
				<UserMessage text={conversation.prompt} />

				<AssistantMessage
					text={conversation.final}
					error={conversation.error}
					streaming={running}
				/>

				{#if workerSteps.length > 0}
					<section class="space-y-2" aria-label="Mixture steps">
						<h2 class="text-xs font-medium text-muted-foreground">
							Mixture steps ({workerSteps.length})
						</h2>
						<MixtureSteps steps={workerSteps} streaming={running} />
					</section>
				{/if}
			{:else}
				<div class="flex flex-col items-center justify-center gap-3 py-24 text-center">
					<div
						class="flex size-12 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground"
					>
						<Sparkles class="size-5" />
					</div>
					<h1 class="text-lg font-semibold">What should the mixture work on?</h1>
					<p class="max-w-md text-sm text-muted-foreground">
						Multiple worker models answer your prompt in parallel, then a judge model synthesizes
						the strongest final response.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="border-t border-border bg-background">
		<div class="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
			<MixtureConfig
				catalog={data.catalog}
				bind:workers
				bind:judgeId
				bind:rounds
				disabled={running}
				userRole={data.userRole}
				{emptyModelsMessage}
			/>

			<PromptInput
				id="prompt"
				label=""
				placeholder="Describe the task for the mixture of agents…"
				bind:value={prompt}
				disabled={running}
				onsubmit={run}
			/>

			<div class="flex items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					{#if data.userRole === 'demo'}
						<span
							class="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
						>
							Demo session
						</span>
					{/if}
					{#if disabledReason}
						<p id="generate-requirements" class="min-w-0 text-xs text-muted-foreground">
							{disabledReason}
						</p>
					{/if}
				</div>
				<Button
					disabled={!canRun}
					onclick={run}
					aria-describedby={disabledReason ? 'generate-requirements' : undefined}
					class="shrink-0 gap-1.5"
				>
					{#if running}
						<Loader2 class="size-4 animate-spin" />
						<span>Generating…</span>
					{:else}
						<ArrowUp class="size-4" />
						<span>Generate</span>
					{/if}
				</Button>
			</div>
		</div>
	</div>
</main>
