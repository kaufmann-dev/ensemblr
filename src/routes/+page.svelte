<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Select from '$lib/components/ui/select';
	import { Slider } from '$lib/components/ui/slider';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Play } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Selection = { providerId: string; modelId: string };
	type WorkerSelection = { id: string; value: string };
	type Output = {
		key: string;
		phase: 'worker' | 'judge';
		round: number;
		model: Selection;
		status: string;
		text: string;
		error?: string;
	};

	let prompt = $state('');
	let workers = $state<WorkerSelection[]>([
		{ id: 'worker-1', value: '' },
		{ id: 'worker-2', value: '' }
	]);
	let judgeId = $state('');
	let rounds = $state(1);
	let temperature = $state(0.7);
	let final = $state('');
	let running = $state(false);
	let error = $state('');
	let generationId = $state('');
	let outputs = $state<Output[]>([]);

	let modelOptions = $derived(
		data.catalog.flatMap((provider) =>
			provider.models.map((model) => ({
				id: `${provider.id}/${model.id}`,
				providerId: provider.id,
				modelId: model.id,
				name: model.name ?? model.id,
				label: `${provider.name}: ${model.name ?? model.id}`,
				provider: provider.name,
				enabled: model.enabled
			}))
		)
	);
	let selectedWorkers = $derived(workers.filter((worker) => worker.value));
	let workerOutputs = $derived(outputs.filter((item) => item.phase === 'worker'));

	function parseSelection(value: string): Selection {
		const [providerId, ...model] = value.split('/');
		return { providerId, modelId: model.join('/') };
	}

	function outputKey(phase: 'worker' | 'judge', round: number, model: Selection) {
		return `${phase}:${round}:${model.providerId}/${model.modelId}`;
	}

	function modelTriggerLabel(value: string, fallback: string) {
		const option = modelOptions.find((model) => model.id === value);
		return option ? `${option.provider}: ${option.name}` : fallback;
	}

	function upsertOutput(event: {
		phase: 'worker' | 'judge';
		round: number;
		model: Selection;
		status?: string;
		text?: string;
		error?: string;
	}) {
		const key = outputKey(event.phase, event.round, event.model);
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
			model: event.model,
			status: event.status ?? 'running',
			text: event.text ?? '',
			error: event.error
		});
	}

	async function run() {
		error = '';
		final = '';
		generationId = '';
		outputs = [];
		running = true;

		const response = await fetch('/api/generate', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				prompt,
				workers: selectedWorkers.map((worker) => parseSelection(worker.value)),
				judge: parseSelection(judgeId),
				rounds,
				options: { temperature }
			})
		});

		if (!response.ok || !response.body) {
			error = await response.text();
			running = false;
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
				if (event.type === 'generation') generationId = event.generationId;
				if (event.type === 'status') upsertOutput(event);
				if (event.type === 'text') {
					upsertOutput(event);
					if (event.phase === 'judge') final += event.text;
				}
				if (event.type === 'error') upsertOutput({ ...event, status: 'failed' });
				if (event.type === 'final') final = event.text;
			}
		}
		running = false;
	}
</script>

<svelte:head><title>Workspace | Ensemblr</title></svelte:head>

<main class="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[18rem_1fr]">
	<aside class="order-2 space-y-4 lg:order-1">
		<Card size="sm">
			<CardHeader>
				<CardTitle class="text-base">Recent runs</CardTitle>
				<CardDescription>Saved generations</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea class="max-h-80">
					<div class="space-y-2 pr-1">
						{#each data.history as item (item.id)}
							<a
								class="block rounded-md border p-3 text-sm hover:bg-muted"
								href={resolve(`/history/${item.id}`)}
							>
								<span class="line-clamp-2 font-medium break-words">{item.prompt.slice(0, 96)}</span>
								<span class="mt-1 block text-xs text-muted-foreground">{item.status}</span>
							</a>
						{:else}
							<p class="text-sm text-muted-foreground">No history yet.</p>
						{/each}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	</aside>

	<section class="order-1 min-w-0 space-y-4 lg:order-2">
		<Card>
			<CardHeader>
				<CardTitle>Mixture workspace</CardTitle>
				<CardDescription>Compose a prompt and choose the models for this run.</CardDescription>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="space-y-2">
					<Label for="prompt">Prompt</Label>
					<Textarea
						id="prompt"
						class="min-h-36 resize-y"
						placeholder="Prompt"
						bind:value={prompt}
					/>
				</div>

				<div class="grid gap-3 md:grid-cols-2">
					{#each workers as worker, index (worker.id)}
						<div class="min-w-0 space-y-2">
							<Label for={worker.id}>Worker {index + 1}</Label>
							<Select.Root type="single" bind:value={worker.value}>
								<Select.Trigger id={worker.id} class="w-full min-w-0">
									<span class="truncate"
										>{modelTriggerLabel(worker.value, `Select worker ${index + 1}`)}</span
									>
								</Select.Trigger>
								<Select.Content class="max-h-80">
									{#each data.catalog as provider (provider.id)}
										<Select.Group>
											<Select.Label>{provider.name}</Select.Label>
											{#each provider.models as model (model.id)}
												<Select.Item
													value={`${provider.id}/${model.id}`}
													label={`${provider.name}: ${model.name ?? model.id}`}
												>
													<span class="truncate">{model.name ?? model.id}</span>
												</Select.Item>
											{/each}
										</Select.Group>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/each}

					<div class="min-w-0 space-y-2">
						<Label for="judge-model">Judge</Label>
						<Select.Root type="single" bind:value={judgeId}>
							<Select.Trigger id="judge-model" class="w-full min-w-0">
								<span class="truncate">{modelTriggerLabel(judgeId, 'Select judge')}</span>
							</Select.Trigger>
							<Select.Content class="max-h-80">
								{#each data.catalog as provider (provider.id)}
									<Select.Group>
										<Select.Label>{provider.name}</Select.Label>
										{#each provider.models as model (model.id)}
											<Select.Item
												value={`${provider.id}/${model.id}`}
												label={`${provider.name}: ${model.name ?? model.id}`}
											>
												<span class="truncate">{model.name ?? model.id}</span>
											</Select.Item>
										{/each}
									</Select.Group>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="grid gap-2 rounded-md border p-3">
						<Label for="rounds">Rounds</Label>
						<input
							id="rounds"
							class="h-9 rounded-md bg-input/50 px-3 text-sm"
							type="number"
							min="0"
							max="3"
							bind:value={rounds}
						/>
					</div>

					<div class="grid gap-3 rounded-md border p-3 md:col-span-2">
						<div class="flex items-center justify-between gap-3">
							<Label for="temperature">Temperature</Label>
							<span class="text-sm text-muted-foreground tabular-nums"
								>{temperature.toFixed(1)}</span
							>
						</div>
						<Slider
							id="temperature"
							type="single"
							bind:value={temperature}
							min={0}
							max={2}
							step={0.1}
						/>
					</div>
				</div>

				<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
					<Button
						class="w-full gap-2 sm:w-auto"
						disabled={running || !prompt || !judgeId || selectedWorkers.length < 2}
						onclick={run}
					>
						<Play class="size-4" />
						{running ? 'Running' : 'Run'}
					</Button>
					<div class="flex min-w-0 flex-wrap items-center gap-2">
						{#if data.userRole === 'demo'}
							<Badge variant="secondary">Demo restricted</Badge>
						{/if}
						{#if generationId}
							<a
								class="text-sm text-muted-foreground underline"
								href={resolve(`/history/${generationId}`)}>Open saved run</a
							>
						{/if}
					</div>
				</div>
				{#if error}
					<p class="text-sm break-words text-destructive">{error}</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Final judge output</CardTitle></CardHeader>
			<CardContent>
				<ScrollArea class="max-h-[34rem] rounded-md bg-muted">
					<pre
						class="min-h-56 max-w-full overflow-x-auto p-4 text-sm break-words whitespace-pre-wrap">{final ||
							'Waiting for judge output.'}</pre>
				</ScrollArea>
			</CardContent>
		</Card>

		<Accordion.Root type="multiple" class="min-w-0">
			{#each workerOutputs as output (output.key)}
				<Accordion.Item value={output.key}>
					<Accordion.Trigger class="min-w-0 text-left">
						<span class="min-w-0 break-words">
							Round {output.round} · {output.model.providerId}/{output.model.modelId} · {output.status}
						</span>
					</Accordion.Trigger>
					<Accordion.Content>
						<ScrollArea class="max-h-96 rounded-md bg-muted">
							<pre
								class="max-w-full overflow-x-auto p-4 text-sm break-words whitespace-pre-wrap">{output.error ??
									output.text}</pre>
						</ScrollArea>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</section>
</main>
