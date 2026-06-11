<script lang="ts">
	import { onMount } from 'svelte';
	import ConversationMessage from '$lib/components/ConversationMessage.svelte';
	import MixtureConfiguration from '$lib/components/MixtureConfiguration.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import PromptInput from '$lib/components/PromptInput.svelte';
	import SecondaryOutputs from '$lib/components/SecondaryOutputs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getAppShellContext } from '$lib/app-shell';
	import { getSidebarHistory } from '$lib/sidebar-history.svelte';
	import {
		RUN_DISABLED_REASON_ID,
		buildConversationView,
		getRunAriaDescribedBy,
		getRunDisabledExplanation,
		isFinalJudgeOutput,
		isMixtureConfigurationValid,
		type WorkspaceOutput
	} from '$lib/workspace';
	import { AlertCircle, Loader2, Play, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const appShell = getAppShellContext();
	const sidebarHistory = getSidebarHistory();

	type Selection = { providerId: string; modelId: string };
	type WorkerSelection = { id: string; value: string };

	let prompt = $state('');
	let activePrompt = $state('');
	let workers = $state<WorkerSelection[]>([
		{ id: 'worker-1', value: '' },
		{ id: 'worker-2', value: '' },
		{ id: 'worker-3', value: '' },
		{ id: 'worker-4', value: '' }
	]);
	let judgeId = $state('');
	let rounds = $state(1);
	let final = $state('');
	let running = $state(false);
	let error = $state('');
	let errorTitle = $state('');
	let errorDetail = $state('');
	let outputs = $state<WorkspaceOutput[]>([]);
	let activeRunToken = 0;

	let hasModelOptions = $derived(data.catalog.some((provider) => provider.models.length > 0));
	let selectedWorkers = $derived(workers.filter((worker) => worker.value));
	let mixtureValid = $derived(
		isMixtureConfigurationValid({
			hasModels: hasModelOptions,
			selectedWorkerCount: selectedWorkers.length,
			judgeId
		})
	);
	let runState = $derived({
		hasModels: hasModelOptions,
		prompt,
		selectedWorkerCount: selectedWorkers.length,
		judgeId,
		running
	});
	let disabledExplanation = $derived(getRunDisabledExplanation(runState));
	let canRun = $derived(mixtureValid && !disabledExplanation);
	let conversation = $derived(
		buildConversationView(activePrompt, final, outputs, rounds, running, error)
	);

	function parseSelection(value: string): Selection {
		const [providerId, ...model] = value.split('/');
		return { providerId, modelId: model.join('/') };
	}

	function outputKey(phase: 'worker' | 'judge', round: number, model: Selection) {
		return `${phase}:${round}:${model.providerId}/${model.modelId}`;
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
		const key = event.outputId ?? outputKey(event.phase, event.round, event.model);
		const existing = outputs.find((item) => item.key === key);
		if (existing) {
			existing.outputId = event.outputId ?? existing.outputId;
			existing.status = event.status ?? existing.status;
			existing.text += event.text ?? '';
			existing.error = event.error ?? existing.error;
			return;
		}
		outputs.push({
			key,
			outputId: event.outputId,
			phase: event.phase,
			round: event.round,
			model: event.model,
			status: event.status ?? 'running',
			text: event.text ?? '',
			error: event.error
		});
	}

	function resetWorkspace() {
		activeRunToken += 1;
		prompt = '';
		activePrompt = '';
		final = '';
		outputs = [];
		error = '';
		errorTitle = '';
		errorDetail = '';
		running = false;
	}

	onMount(() => appShell.registerWorkspaceReset(resetWorkspace));

	async function run() {
		if (!canRun) return;

		const runToken = (activeRunToken += 1);
		activePrompt = prompt;
		const submittedPrompt = activePrompt;
		error = '';
		errorTitle = '';
		errorDetail = '';
		final = '';
		outputs = [];
		running = true;

		const currentRunActive = () => runToken === activeRunToken;

		try {
			const response = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					prompt: activePrompt,
					workers: selectedWorkers.map((worker) => parseSelection(worker.value)),
					judge: parseSelection(judgeId),
					rounds
				})
			});

			if (!response.ok || !response.body) {
				if (!currentRunActive()) return;
				error = await response.text();
				if (response.status === 429) {
					const retryAfterSeconds = Number(response.headers.get('retry-after'));
					const retryAfterMinutes = Number.isFinite(retryAfterSeconds)
						? Math.max(1, Math.ceil(retryAfterSeconds / 60))
						: null;

					errorTitle = 'Demo rate limit reached';
					errorDetail = retryAfterMinutes
						? `No provider API call was started. Try again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? '' : 's'}.`
						: 'No provider API call was started. Try again after the current rate-limit window resets.';
				} else {
					errorTitle = 'Generation could not start';
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
						sidebarHistory.startGeneration({
							id: event.generationId,
							prompt: submittedPrompt,
							status: 'running',
							createdAt: new Date().toISOString()
						});
						continue;
					}

					if (!currentRunActive()) continue;
					if (event.type === 'status') upsertOutput(event);
					if (event.type === 'text') {
						upsertOutput(event);
						if (isFinalJudgeOutput(event, rounds)) final += event.text;
					}
					if (event.type === 'error') {
						upsertOutput({ ...event, status: 'failed' });
						if (!event.outputId || (event.phase === 'judge' && event.round > rounds)) {
							errorTitle = 'Synthesis failed';
							error = event.error;
						}
					}
					if (event.type === 'final') final = event.text;
				}
			}
		} catch {
			if (!currentRunActive()) return;
			errorTitle = 'Generation could not start';
			error = 'Generation could not be started. Try again.';
		} finally {
			if (currentRunActive()) running = false;
		}
	}
</script>

<svelte:head><title>Workspace | ensemblr</title></svelte:head>

<main class="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-5 sm:gap-6 sm:py-8">
	<PageHeader
		title="Mixture workspace"
		description="Write a prompt, configure the mixture, and read the synthesis."
		icon={Sparkles}
	>
		{#snippet badge()}
			{#if running}
				<span
					class="ml-2 flex items-center gap-1.5 rounded border border-border bg-foreground/5 px-2 py-0.5 text-xs text-foreground"
				>
					<Loader2 class="size-3 animate-spin" />
					<span>Synthesizing</span>
				</span>
			{/if}
		{/snippet}
	</PageHeader>

	<section
		class={[
			'order-3 flex flex-1 flex-col gap-6 md:order-2 md:min-h-[20rem] md:justify-center',
			!conversation.userMessage && 'hidden md:flex'
		]}
		aria-label="Active conversation"
	>
		{#if conversation.userMessage}
			<ConversationMessage {...conversation.userMessage} />
			{#if conversation.primaryAssistant}
				<ConversationMessage
					{...conversation.primaryAssistant}
					status={running ? 'running' : error ? 'failed' : 'completed'}
				/>
			{/if}
			<SecondaryOutputs outputs={conversation.secondaryOutputs} />
		{:else}
			<div class="mx-auto max-w-lg py-12 text-center">
				<Sparkles class="mx-auto mb-4 size-7 text-muted-foreground" />
				<h2 class="text-base font-semibold text-foreground">Start with a prompt</h2>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Selected workers will develop responses, intermediate judges will refine them, and the
					final judge will stream a synthesized answer here.
				</p>
			</div>
		{/if}
	</section>

	<section
		class="order-2 space-y-3 md:sticky md:bottom-0 md:z-10 md:border-t md:border-border md:bg-background/95 md:pt-4 md:pb-2 md:backdrop-blur"
		aria-label="Synthesis composer"
	>
		<PromptInput
			id="prompt"
			label="Prompt"
			placeholder="What would you like the mixture to synthesize?"
			bind:value={prompt}
			disabled={running}
			minHeight="88px"
			showCharCount={true}
			monospace={false}
			class="rounded border border-border bg-card p-3 sm:p-4"
		/>

		<MixtureConfiguration
			catalog={data.catalog}
			userRole={data.userRole}
			keyProviders={data.keyProviders}
			bind:workers
			bind:judgeId
			bind:rounds
			{running}
		/>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
			<Button
				class="h-9 w-full gap-2 rounded px-4 text-sm font-semibold shadow-none sm:w-auto"
				disabled={!canRun}
				onclick={run}
				aria-describedby={getRunAriaDescribedBy(runState)}
			>
				{#if running}
					<Loader2 class="size-3.5 animate-spin" />
					<span>Running synthesis</span>
				{:else}
					<Play class="size-3.5 fill-current" />
					<span>Run synthesis</span>
				{/if}
			</Button>
			{#if disabledExplanation}
				<p id={RUN_DISABLED_REASON_ID} class="text-xs text-muted-foreground">
					{disabledExplanation}
				</p>
			{/if}
		</div>

		{#if error}
			<div
				class="flex items-start gap-2.5 rounded border border-destructive/20 bg-destructive/5 p-3"
			>
				<AlertCircle class="mt-0.5 size-4 shrink-0 text-destructive" />
				<div class="min-w-0 space-y-1">
					<p class="text-sm font-semibold break-words text-destructive">
						{errorTitle || 'Generation could not start'}
					</p>
					<p class="text-sm break-words text-destructive">{error}</p>
					{#if errorDetail}
						<p class="text-xs break-words text-destructive/80">{errorDetail}</p>
					{/if}
				</div>
			</div>
		{/if}
	</section>
</main>
