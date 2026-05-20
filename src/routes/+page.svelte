<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Accordion from '$lib/components/ui/accordion';
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

<main class="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[18rem_1fr]">
	<aside class="space-y-4">
		<Card>
			<CardHeader><CardTitle class="text-base">Recent runs</CardTitle></CardHeader>
			<CardContent class="space-y-3">
				{#each data.history as item (item.id)}
					<a
						class="block rounded-md border p-3 text-sm hover:bg-muted"
						href={resolve(`/history/${item.id}`)}
					>
						<span class="block font-medium">{item.prompt.slice(0, 72)}</span>
						<span class="text-xs text-muted-foreground">{item.status}</span>
					</a>
				{:else}
					<p class="text-sm text-muted-foreground">No history yet.</p>
				{/each}
			</CardContent>
		</Card>
	</aside>

	<section class="space-y-4">
		<Card>
			<CardHeader><CardTitle>Mixture workspace</CardTitle></CardHeader>
			<CardContent class="space-y-4">
				<Textarea class="min-h-32" placeholder="Prompt" bind:value={prompt} />
				<div class="grid gap-3 md:grid-cols-2">
					{#each workers as worker, index (worker.id)}
						<label class="sr-only" for={worker.id}>Worker {index + 1} model</label>
						<select
							id={worker.id}
							class="h-10 rounded-md border bg-background px-3 text-sm"
							bind:value={worker.value}
						>
							<option value="">Worker {index + 1}</option>
							{#each modelOptions as model (model.id)}
								<option value={model.id} disabled={!model.enabled}
									>{model.provider}: {model.name}</option
								>
							{/each}
						</select>
					{/each}
					<label class="sr-only" for="judge-model">Judge model</label>
					<select
						id="judge-model"
						class="h-10 rounded-md border bg-background px-3 text-sm"
						bind:value={judgeId}
					>
						<option value="">Judge model</option>
						{#each modelOptions as model (model.id)}
							<option value={model.id} disabled={!model.enabled}
								>{model.provider}: {model.name}</option
							>
						{/each}
					</select>
					<label class="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
						Rounds
						<input class="w-16 bg-transparent" type="number" min="0" max="3" bind:value={rounds} />
					</label>
					<label class="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
						Temperature
						<input
							class="w-20 bg-transparent"
							type="number"
							min="0"
							max="2"
							step="0.1"
							bind:value={temperature}
						/>
					</label>
				</div>
				<div class="flex items-center gap-2">
					<Button
						disabled={running || !prompt || !judgeId || selectedWorkers.length < 2}
						onclick={run}
					>
						Run
					</Button>
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
				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</CardContent>
		</Card>

		<Card>
			<CardHeader><CardTitle>Final judge output</CardTitle></CardHeader>
			<CardContent>
				<pre class="min-h-56 rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">{final ||
						'Waiting for judge output.'}</pre>
			</CardContent>
		</Card>

		<Accordion.Root type="multiple">
			{#each workerOutputs as output (output.key)}
				<Accordion.Item value={output.key}>
					<Accordion.Trigger>
						Round {output.round} · {output.model.providerId}/{output.model.modelId} · {output.status}
					</Accordion.Trigger>
					<Accordion.Content>
						<pre class="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">{output.error ??
								output.text}</pre>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</section>
</main>
