<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Select from '$lib/components/ui/select';
	import { Slider } from '$lib/components/ui/slider';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Accordion from '$lib/components/ui/accordion';
	import { 
		Key, 
		Play, 
		Sparkles, 
		History, 
		ShieldCheck, 
		Copy, 
		Check, 
		Cpu, 
		Layers,
		Thermometer,
		Activity,
		Loader2,
		AlertCircle
	} from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Selection = { providerId: string; modelId: string };
	type WorkerSelection = { id: string; value: string };
	type Output = {
		key: string;
		outputId?: string;
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
		{ id: 'worker-2', value: '' },
		{ id: 'worker-3', value: '' },
		{ id: 'worker-4', value: '' }
	]);
	let judgeId = $state('');
	let rounds = $state(1);
	let temperature = $state(0.7);
	let final = $state('');
	let running = $state(false);
	let error = $state('');
	let generationId = $state('');
	let outputs = $state<Output[]>([]);

	let copySuccess = $state(false);

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
	let hasModelOptions = $derived(modelOptions.length > 0);
	let emptyModelsMessage = $derived(
		data.userRole === 'demo'
			? 'No demo models are currently enabled.'
			: data.keyProviders.length === 0
				? 'Add an API key before selecting models.'
				: 'None of your saved providers currently have enabled models.'
	);
	let canRun = $derived(
		!running &&
			hasModelOptions &&
			Boolean(prompt) &&
			Boolean(judgeId) &&
			selectedWorkers.length >= 2
	);

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

	async function run() {
		if (!canRun) return;

		error = '';
		final = '';
		generationId = '';
		outputs = [];
		running = true;

		try {
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
		} catch {
			error = 'Generation could not be started. Try again.';
		} finally {
			running = false;
		}
	}

	async function copyFinalOutput() {
		if (!final) return;
		try {
			await navigator.clipboard.writeText(final);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch {
			// fallback
		}
	}
</script>

<svelte:head><title>Workspace | ensemblr</title></svelte:head>

<main class="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[18rem_1fr] flex-1 min-h-0">
	<!-- Sidebar Pane: History -->
	<aside class="order-2 space-y-4 lg:order-1 lg:max-w-[18rem]">
		<div class="h-full flex flex-col">
			<div class="pb-3 pt-4 px-1 border-b border-border flex items-center gap-2">
				<History class="size-4 text-foreground/80" />
				<div>
					<h3 class="text-xs font-bold font-mono tracking-tight text-foreground uppercase">Recent runs</h3>
					<p class="text-[9px] font-mono text-muted-foreground mt-0.5">Saved mixture history</p>
				</div>
			</div>
			<div class="py-2.5 flex-1 overflow-hidden">
				<ScrollArea class="h-[25rem] lg:h-[calc(100vh-17rem)]">
					<div class="space-y-1.5 pr-2 py-0.5">
						{#each data.history as item (item.id)}
							<a
								class="group/item block rounded border border-border bg-muted/20 p-2.5 hover:bg-muted/65 hover:border-foreground/30"
								href={resolve(`/history/${item.id}`)}
							>
								<div class="line-clamp-2 font-mono text-[11px] leading-relaxed text-foreground/80 group-hover/item:text-foreground break-words">
									{item.prompt}
								</div>
								<div class="mt-2.5 flex items-center justify-between gap-2">
									<span class="text-[9px] font-mono text-muted-foreground/75 tabular-nums">
										{new Date(item.createdAt).toLocaleDateString()}
									</span>
									<span 
										class={cn(
											"text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border tracking-wide",
											item.status === 'completed' 
												? "border-border bg-foreground/5 text-foreground" 
												: "border-destructive/20 bg-destructive/5 text-destructive"
										)}
									>
										{item.status}
									</span>
								</div>
							</a>
						{:else}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<History class="size-7 text-muted-foreground/35 mb-2 stroke-[1.5]" />
								<p class="text-[11px] font-mono text-muted-foreground/75">No generations saved yet.</p>
							</div>
						{/each}
					</div>
				</ScrollArea>
			</div>
		</div>
	</aside>

	<!-- Main Workspace Area -->
	<section class="order-1 min-w-0 space-y-5 lg:order-2 flex flex-col">
		<PageHeader
			title="Mixture workspace"
			description="Orchestrate LLMs via Mixture-of-Agents (MoA)"
			icon={Sparkles}
		>
			{#snippet badge()}
				{#if running}
					<span class="flex items-center gap-1.5 border border-border bg-foreground/5 text-foreground py-0.5 px-2 rounded font-mono text-[9px] uppercase tracking-wider animate-pulse ml-2">
						<Loader2 class="size-3 animate-spin" />
						<span>Synthesizing</span>
					</span>
				{/if}
			{/snippet}
		</PageHeader>

		<div class="space-y-4.5 px-1 pb-2">
				<!-- Prompt Area -->
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<Label for="prompt" class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">System prompt input</Label>
						<span class="text-[9px] font-mono text-muted-foreground/60 tabular-nums">
							{prompt.length} chars
						</span>
					</div>
					<Textarea
						id="prompt"
						class="min-h-32 resize-y font-mono text-xs p-3"
						placeholder="What would you like the Mixture-of-Agents to synthesize? Enter a complex task, coding query, or reasoning prompt..."
						bind:value={prompt}
						disabled={running}
					/>
				</div>

				{#if hasModelOptions}
					<!-- Workers and Judge Select Grid -->
					<div class="grid gap-4 md:grid-cols-2">
						<!-- Loop through Workers -->
						{#each workers as worker, index (worker.id)}
							<div class="space-y-1.5 group/select">
								<div class="flex items-center gap-1.5">
									<Cpu class="size-3.5 text-muted-foreground/70" />
									<Label for={worker.id} class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Worker Model {index + 1}{index > 1 ? ' (OPTIONAL)' : ''}</Label>
								</div>
								
								<Select.Root type="single" bind:value={worker.value} disabled={running}>
									<Select.Trigger id={worker.id} class="text-xs font-mono font-medium">
										<span class="truncate">
											{modelTriggerLabel(worker.value, `Select worker ${index + 1}`)}
										</span>
									</Select.Trigger>
									<Select.Content class="p-1">
										{#each data.catalog as provider (provider.id)}
											<Select.Group>
												<Select.Label class="text-[9px] uppercase font-mono font-black text-muted-foreground px-2.5 py-1.5 tracking-widest">{provider.name}</Select.Label>
												{#each provider.models as model (model.id)}
													<Select.Item
														value={`${provider.id}/${model.id}`}
														label={`${provider.name}: ${model.name ?? model.id}`}
														class="rounded-sm mx-0.5 text-xs font-mono px-2 py-1.5 cursor-pointer"
													>
														<span class="truncate font-medium">{model.name ?? model.id}</span>
													</Select.Item>
												{/each}
											</Select.Group>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
						{/each}

						<!-- Select Judge -->
						<div class="space-y-1.5 group/select">
							<div class="flex items-center gap-1.5">
								<ShieldCheck class="size-3.5 text-muted-foreground" />
								<Label for="judge-model" class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Synthesizing Judge Model</Label>
							</div>
							
							<Select.Root type="single" bind:value={judgeId} disabled={running}>
								<Select.Trigger id="judge-model" class="text-xs font-mono font-medium">
									<span class="truncate">
										{modelTriggerLabel(judgeId, 'Select judge model')}
									</span>
								</Select.Trigger>
								<Select.Content class="p-1">
									{#each data.catalog as provider (provider.id)}
										<Select.Group>
											<Select.Label class="text-[9px] uppercase font-mono font-black text-muted-foreground px-2.5 py-1.5 tracking-widest">{provider.name}</Select.Label>
											{#each provider.models as model (model.id)}
												<Select.Item
													value={`${provider.id}/${model.id}`}
													label={`${provider.name}: ${model.name ?? model.id}`}
													class="rounded-sm mx-0.5 text-xs font-mono px-2 py-1.5 cursor-pointer"
												>
													<span class="truncate font-medium">{model.name ?? model.id}</span>
												</Select.Item>
											{/each}
										</Select.Group>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Stepper Config: Rounds -->
						<div class="space-y-1.5">
							<div class="flex items-center gap-1.5">
								<Layers class="size-3.5 text-muted-foreground/80" />
								<Label for="rounds" class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Rounds of mixture</Label>
							</div>
							<div class="relative flex items-center">
								<Input
									id="rounds"
									class="text-xs font-mono pr-14"
									type="number"
									min="1"
									max="3"
									bind:value={rounds}
									disabled={running}
								/>
								<span class="absolute right-3 text-[9px] text-muted-foreground uppercase font-mono tracking-widest">
									Max 3
								</span>
							</div>
						</div>

						<!-- Config Slider: Temperature -->
						<div class="grid gap-3 rounded border border-border bg-muted/30 p-3 md:col-span-2">
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-1.5">
									<Thermometer class="size-3.5 text-foreground/80" />
									<Label class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Generation Temperature</Label>
								</div>
								<span class="text-[10px] font-mono font-bold bg-foreground/10 px-2 py-0.5 rounded text-foreground tabular-nums">
									{temperature.toFixed(1)}
								</span>
							</div>
							<div class="flex items-center gap-3 pt-1">
								<span class="text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-widest">Precise</span>
								<Slider
									id="temperature"
									type="single"
									bind:value={temperature}
									min={0}
									max={2}
									step={0.1}
									disabled={running}
									class="flex-1"
								/>
								<span class="text-[9px] font-mono font-medium text-muted-foreground uppercase tracking-widest">Creative</span>
							</div>
						</div>
					</div>
				{:else}
					<!-- Key Setup Callout -->
					<div class="flex flex-col gap-4 rounded border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-start gap-3 min-w-0">
							<div class="flex size-8 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground">
								<Key class="size-3.5" />
							</div>
							<div class="min-w-0">
								<h4 class="text-xs font-mono font-bold text-foreground">No Models Available</h4>
								<p class="text-[10px] font-mono text-muted-foreground mt-0.5 break-words">
									{emptyModelsMessage}
								</p>
							</div>
						</div>
						{#if data.userRole !== 'demo'}
							<Button href={resolve('/settings')} variant="outline" size="sm" class="rounded h-8 text-[10px] font-mono shrink-0 border-border text-foreground hover:bg-muted">
								Configure keys
							</Button>
						{/if}
					</div>
				{/if}

				<!-- Execution Bar -->
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center border-t border-border pt-4">
					<Button 
						class="w-full gap-2 sm:w-auto h-8.5 px-4 font-mono text-xs font-bold rounded shadow-none" 
						disabled={!canRun} 
						onclick={run}
					>
						{#if running}
							<Loader2 class="size-3.5 animate-spin" />
							<span>Running Mixture</span>
						{:else}
							<Play class="size-3.5 fill-current" />
							<span>Run Synthesis</span>
						{/if}
					</Button>
					
					<div class="flex min-w-0 flex-wrap items-center gap-3">
						{#if data.userRole === 'demo'}
							<span class="border border-border bg-muted text-muted-foreground font-mono text-[9px] uppercase px-1.5 py-0.5 rounded">
								Demo restricted
							</span>
						{/if}
						
						{#if generationId}
							<a
								class="text-[11px] font-mono text-foreground hover:underline underline-offset-4 flex items-center gap-1.5 transition-colors"
								href={resolve(`/history/${generationId}`)}
							>
								<Activity class="size-3" />
								<span>Open saved run details</span>
							</a>
						{/if}
					</div>
				</div>
				
				{#if error}
					<div class="rounded border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2.5">
						<AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
						<p class="text-[11px] font-mono text-destructive break-words">{error}</p>
					</div>
				{/if}
		</div>

		<!-- Live Streaming / Synthesis Final Result -->
		<Card class="border border-border bg-card rounded flex flex-col min-h-[350px] overflow-hidden">
			<CardHeader class="pb-3 pt-4 px-5 flex flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-2">
					<ShieldCheck class="size-4 text-foreground/80" />
					<div>
						<CardTitle class="text-sm font-bold font-mono tracking-tight">Synthesis Output</CardTitle>
						<CardDescription class="text-[10px] font-mono text-muted-foreground mt-0.5">Real-time finalized MoA judge synthesis</CardDescription>
					</div>
				</div>
				{#if final}
					<Button 
						variant="ghost" 
						size="icon" 
						onclick={copyFinalOutput} 
						class="size-7 rounded text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all"
						aria-label="Copy output"
					>
						{#if copySuccess}
							<Check class="size-3.5 text-foreground" />
						{:else}
							<Copy class="size-3.5" />
						{/if}
					</Button>
				{/if}
			</CardHeader>
			<CardContent class="p-0 flex-1 flex flex-col bg-muted/5 border-t border-border">
				<ScrollArea class="h-80 lg:h-[26rem] w-full flex-1">
					{#if final}
						<pre class="code-area p-5 text-foreground/90 whitespace-pre-wrap selection:bg-foreground/10 break-words select-text outline-none">{final}</pre>
					{:else if running}
						<div class="flex flex-col items-center justify-center p-20 text-center h-full">
							<Loader2 class="size-6 text-muted-foreground/60 animate-spin mb-3 stroke-[1.5]" />
							<p class="text-xs font-mono text-muted-foreground/80 animate-pulse">Mixture-of-Agents is generating synthesis... Please wait.</p>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center p-20 text-center text-muted-foreground/50 h-full">
							<Cpu class="size-8 text-muted-foreground/35 mb-2 stroke-[1.2]" />
							<p class="text-[11px] font-mono max-w-sm leading-relaxed text-muted-foreground/75">
								Waiting for execution. Fill the system prompt and trigger the mixture synthesis.
							</p>
						</div>
					{/if}
				</ScrollArea>
			</CardContent>
		</Card>

		<!-- Mixture Step Outputs Collapse Accordion -->
		{#if outputs.length > 0}
			<div class="space-y-3 pt-2">
				<div class="flex items-center gap-2 px-1">
					<Layers class="size-4 text-foreground/80" />
					<h3 class="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Mixture Steps ({outputs.length})</h3>
				</div>
				
				<Accordion.Root type="multiple" class="w-full grid gap-2">
					{#each outputs as output (output.key)}
						<Accordion.Item value={output.key} class="rounded border border-border bg-card overflow-hidden hover:border-foreground/30">
							<Accordion.Trigger class="px-4 py-2.5 text-xs font-mono font-medium hover:no-underline hover:bg-muted/40 transition-colors flex items-center justify-between gap-4 min-w-0 w-full">
								<div class="flex items-center gap-2.5 min-w-0">
									<span class="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-border bg-muted text-muted-foreground tracking-wide rounded-sm whitespace-nowrap shrink-0">
										{output.phase} · Round {output.round}
									</span>
									<span class="truncate text-foreground/90 font-mono text-[11px]">
										{output.model.providerId}/{output.model.modelId}
									</span>
								</div>
								
								<span 
									class={cn(
										"text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-medium border shrink-0",
										output.status === 'completed'
											? "border-border bg-foreground/5 text-foreground"
											: output.status === 'failed'
												? "border-destructive/30 bg-destructive/5 text-destructive"
												: "border-border bg-muted text-muted-foreground animate-pulse"
									)}
								>
									{output.status}
								</span>
							</Accordion.Trigger>
							<Accordion.Content class="p-0 border-t border-border bg-muted/5">
								<ScrollArea class="max-h-96 w-full">
									<pre class="code-area p-4 text-foreground/85 whitespace-pre-wrap break-words bg-muted/10 selection:bg-foreground/10 outline-none">{output.error ?? output.text}</pre>
								</ScrollArea>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			</div>
		{/if}
	</section>
</main>
