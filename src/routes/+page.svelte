<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils.js';
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
	let workerOutputs = $derived(outputs.filter((item) => item.phase === 'worker'));
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

<svelte:head><title>Workspace | Ensemblr</title></svelte:head>

<main class="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[20rem_1fr] flex-1 min-h-0">
	<!-- Sidebar Pane: History -->
	<aside class="order-2 space-y-5 lg:order-1 lg:max-w-[20rem]">
		<Card class="glass-panel border-border/30 premium-glow-cyan h-full flex flex-col">
			<CardHeader class="pb-3 border-b border-border/20">
				<div class="flex items-center gap-2">
					<History class="size-4 text-cyan-400" />
					<CardTitle class="text-base font-bold">Recent runs</CardTitle>
				</div>
				<CardDescription class="text-xs">Your saved mixture history</CardDescription>
			</CardHeader>
			<CardContent class="p-3 flex-1 overflow-hidden">
				<ScrollArea class="h-[25rem] lg:h-[calc(100vh-17rem)]">
					<div class="space-y-2 pr-2 py-1">
						{#each data.history as item (item.id)}
							<a
								class="group/item block rounded-xl border border-border/25 bg-muted/10 p-3 text-sm transition-all hover:bg-muted/40 hover:border-cyan-500/30 hover:scale-[0.99] active:scale-95"
								href={resolve(`/history/${item.id}`)}
							>
								<div class="line-clamp-2 font-medium text-foreground/90 group-hover/item:text-foreground break-words transition-colors">
									{item.prompt}
								</div>
								<div class="mt-2 flex items-center justify-between gap-2">
									<span class="text-[10px] uppercase font-bold text-muted-foreground/60 tabular-nums">
										{new Date(item.createdAt).toLocaleDateString()}
									</span>
									<Badge 
										variant="outline" 
										class={cn(
											"text-[9px] px-1.5 py-0 font-bold uppercase",
											item.status === 'completed' 
												? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" 
												: "border-amber-500/20 bg-amber-500/5 text-amber-400"
										)}
									>
										{item.status}
									</Badge>
								</div>
							</a>
						{:else}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<History class="size-8 text-muted-foreground/35 mb-2 stroke-[1.5]" />
								<p class="text-xs text-muted-foreground/80">No generations saved yet.</p>
							</div>
						{/each}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	</aside>

	<!-- Main Workspace Area -->
	<section class="order-1 min-w-0 space-y-6 lg:order-2 flex flex-col">
		<Card class="glass-panel border-border/30 premium-glow-purple">
			<CardHeader class="pb-3 border-b border-border/20">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2.5">
						<div class="flex size-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
							<Sparkles class="size-4 text-primary animate-pulse" />
						</div>
						<div>
							<CardTitle class="text-lg font-bold tracking-tight">Mixture workspace</CardTitle>
							<CardDescription class="text-xs">Synthesize responses using Mixture-of-Agents (MoA)</CardDescription>
						</div>
					</div>
					{#if running}
						<Badge variant="outline" class="flex items-center gap-1.5 border-primary/30 bg-primary/5 text-primary py-1 px-2.5 rounded-full font-semibold animate-pulse">
							<Loader2 class="size-3 animate-spin" />
							<span>Synthesizing</span>
						</Badge>
					{/if}
				</div>
			</CardHeader>

			<CardContent class="space-y-6 pt-5">
				<!-- Prompt Area -->
				<div class="space-y-2.5">
					<div class="flex justify-between items-center">
						<Label for="prompt" class="text-xs font-bold uppercase tracking-wider text-foreground/85">System prompt input</Label>
						<span class="text-[10px] font-mono text-muted-foreground/60 tabular-nums">
							{prompt.length} chars
						</span>
					</div>
					<Textarea
						id="prompt"
						class="min-h-36 resize-y font-sans text-sm focus-visible:ring-primary/15"
						placeholder="What would you like the Mixture-of-Agents to synthesize? Enter a complex task, coding query, or reasoning prompt..."
						bind:value={prompt}
						disabled={running}
					/>
				</div>

				{#if hasModelOptions}
					<!-- Workers and Judge Select Grid -->
					<div class="grid gap-5 md:grid-cols-2">
						<!-- Loop through Workers -->
						{#each workers as worker, index (worker.id)}
							<div class="space-y-2 group/select">
								<div class="flex items-center gap-1.5">
									<Cpu class="size-3.5 text-muted-foreground/80 group-hover/select:text-primary transition-colors" />
									<Label for={worker.id} class="text-xs font-bold uppercase tracking-wider text-foreground/80">Worker Model {index + 1}</Label>
								</div>
								
								<Select.Root type="single" bind:value={worker.value} disabled={running}>
									<Select.Trigger id={worker.id} class="w-full">
										<span class="truncate">
											{modelTriggerLabel(worker.value, `Select synthesis worker ${index + 1}`)}
										</span>
									</Select.Trigger>
									<Select.Content class="max-h-80 border-border/30 bg-popover/95 backdrop-blur-2xl">
										{#each data.catalog as provider (provider.id)}
											<Select.Group>
												<Select.Label class="text-[10px] uppercase font-black text-muted-foreground/50 tracking-widest px-2 py-1">{provider.name}</Select.Label>
												{#each provider.models as model (model.id)}
													<Select.Item
														value={`${provider.id}/${model.id}`}
														label={`${provider.name}: ${model.name ?? model.id}`}
														class="rounded-xl mx-1"
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
						<div class="space-y-2 group/select">
							<div class="flex items-center gap-1.5">
								<ShieldCheck class="size-3.5 text-cyan-400/80 group-hover/select:text-cyan-400 transition-colors" />
								<Label for="judge-model" class="text-xs font-bold uppercase tracking-wider text-foreground/80">Synthesizing Judge Model</Label>
							</div>
							
							<Select.Root type="single" bind:value={judgeId} disabled={running}>
								<Select.Trigger id="judge-model" class="w-full border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-500/40 text-cyan-200">
									<span class="truncate font-semibold text-cyan-200">
										{modelTriggerLabel(judgeId, 'Select judge model')}
									</span>
								</Select.Trigger>
								<Select.Content class="max-h-80 border-cyan-500/20 bg-popover/95 backdrop-blur-2xl">
									{#each data.catalog as provider (provider.id)}
										<Select.Group>
											<Select.Label class="text-[10px] uppercase font-black text-muted-foreground/50 tracking-widest px-2 py-1">{provider.name}</Select.Label>
											{#each provider.models as model (model.id)}
												<Select.Item
													value={`${provider.id}/${model.id}`}
													label={`${provider.name}: ${model.name ?? model.id}`}
													class="rounded-xl mx-1 focus:bg-cyan-500/10 focus:text-cyan-200"
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
						<div class="space-y-2">
							<div class="flex items-center gap-1.5">
								<Layers class="size-3.5 text-muted-foreground/80" />
								<Label for="rounds" class="text-xs font-bold uppercase tracking-wider text-foreground/80">Rounds of mixture</Label>
							</div>
							<div class="relative flex items-center">
								<input
									id="rounds"
									class="h-9 w-full rounded-xl border border-border/40 bg-card/45 backdrop-blur-sm px-4 text-sm font-medium transition-all focus:border-primary/80 focus:ring-3 focus:ring-primary/15 outline-none"
									type="number"
									min="1"
									max="3"
									bind:value={rounds}
									disabled={running}
								/>
								<span class="absolute right-3 text-[10px] text-muted-foreground/50 uppercase font-bold tracking-wider">
									Rounds (Max 3)
								</span>
							</div>
						</div>

						<!-- Config Slider: Temperature -->
						<div class="grid gap-3 rounded-xl border border-border/30 bg-muted/10 p-3 md:col-span-2">
							<div class="flex items-center justify-between gap-3">
								<div class="flex items-center gap-1.5">
									<Thermometer class="size-3.5 text-amber-400" />
									<Label for="temperature" class="text-xs font-bold uppercase tracking-wider text-foreground/80">Generation Temperature</Label>
								</div>
								<span class="text-xs font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded-full text-amber-400 tabular-nums">
									{temperature.toFixed(1)}
								</span>
							</div>
							<div class="flex items-center gap-3 pt-1">
								<span class="text-[10px] font-bold text-muted-foreground/60 uppercase">Precise</span>
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
								<span class="text-[10px] font-bold text-muted-foreground/60 uppercase">Creative</span>
							</div>
						</div>
					</div>
				{:else}
					<!-- Key Setup Callout -->
					<div class="flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
						<div class="flex items-start gap-3 min-w-0">
							<div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
								<Key class="size-4" />
							</div>
							<div class="min-w-0">
								<h4 class="text-sm font-bold text-amber-200">No Models Available</h4>
								<p class="text-xs text-muted-foreground/80 mt-0.5 break-words">
									{emptyModelsMessage}
								</p>
							</div>
						</div>
						{#if data.userRole !== 'demo'}
							<Button href={resolve('/settings')} variant="outline" size="sm" class="rounded-xl shrink-0 border-amber-500/25 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
								Configure keys
							</Button>
						{/if}
					</div>
				{/if}

				<!-- Execution Bar -->
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center border-t border-border/20 pt-4">
					<Button 
						class="w-full gap-2 sm:w-auto h-11 px-6 font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 text-base" 
						disabled={!canRun} 
						onclick={run}
					>
						{#if running}
							<Loader2 class="size-4 animate-spin" />
							<span>Running Mixture</span>
						{:else}
							<Play class="size-4 fill-current" />
							<span>Run Synthesis</span>
						{/if}
					</Button>
					
					<div class="flex min-w-0 flex-wrap items-center gap-3">
						{#if data.userRole === 'demo'}
							<Badge variant="secondary" class="border-cyan-500/20 bg-cyan-500/10 text-cyan-300 font-semibold px-2 py-0.5">
								Demo restricted
							</Badge>
						{/if}
						
						{#if generationId}
							<a
								class="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4 font-bold flex items-center gap-1.5 transition-colors"
								href={resolve(`/history/${generationId}`)}
							>
								<Activity class="size-3" />
								<span>Open saved run details</span>
							</a>
						{/if}
					</div>
				</div>
				
				{#if error}
					<div class="rounded-xl border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2.5">
						<AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
						<p class="text-xs font-semibold text-destructive break-words">{error}</p>
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Live Streaming / Synthesis Final Result -->
		<Card class="glass-panel border-border/30 premium-glow-cyan flex flex-col min-h-80 overflow-hidden">
			<CardHeader class="pb-3 border-b border-border/20 flex flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-2">
					<ShieldCheck class="size-4 text-cyan-400" />
					<div>
						<CardTitle class="text-base font-bold">Synthesis Synthesis Output</CardTitle>
						<CardDescription class="text-[10px]">Real-time finalized MoA judge synthesis</CardDescription>
					</div>
				</div>
				{#if final}
					<Button 
						variant="ghost" 
						size="icon" 
						onclick={copyFinalOutput} 
						class="size-8 rounded-lg text-muted-foreground hover:text-cyan-400 active:scale-95 transition-all"
						aria-label="Copy output"
					>
						{#if copySuccess}
							<Check class="size-3.5 text-emerald-400" />
						{:else}
							<Copy class="size-3.5" />
						{/if}
					</Button>
				{/if}
			</CardHeader>
			<CardContent class="p-0 flex-1 flex flex-col bg-muted/15">
				<ScrollArea class="h-80 lg:h-[26rem] w-full flex-1">
					{#if final}
						<pre class="code-area p-5 text-foreground/90 whitespace-pre-wrap selection:bg-cyan-500/25 break-words select-text">{final}</pre>
					{:else if running}
						<div class="flex flex-col items-center justify-center p-20 text-center h-full">
							<Loader2 class="size-8 text-cyan-400 animate-spin mb-3 stroke-[1.5]" />
							<p class="text-xs font-medium text-muted-foreground animate-pulse">Mixture-of-Agents is generating synthesis... Please wait.</p>
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center p-20 text-center text-muted-foreground/50 h-full">
							<Cpu class="size-10 text-muted-foreground/35 mb-3 stroke-[1.2] animate-bounce duration-[3s]" />
							<p class="text-xs font-medium max-w-sm leading-relaxed text-muted-foreground/70">
								Waiting for execution. Fill the system prompt and trigger the mixture synthesis.
							</p>
						</div>
					{/if}
				</ScrollArea>
			</CardContent>
		</Card>

		<!-- Worker Outputs Collapse Accordion -->
		{#if workerOutputs.length > 0}
			<div class="space-y-3 pt-2">
				<div class="flex items-center gap-2 px-1">
					<Layers class="size-4 text-primary" />
					<h3 class="text-xs font-bold uppercase tracking-wider text-foreground/80">Worker Mixture Layers ({workerOutputs.length})</h3>
				</div>
				
				<Accordion.Root type="multiple" class="w-full grid gap-2">
					{#each workerOutputs as output (output.key)}
						<Accordion.Item value={output.key} class="rounded-xl border border-border/25 bg-card/45 backdrop-blur-md overflow-hidden transition-all duration-300 hover:border-primary/25 shadow-sm">
							<Accordion.Trigger class="px-4 py-3 text-sm font-semibold hover:no-underline hover:bg-muted/10 transition-colors flex items-center justify-between gap-4">
								<div class="flex items-center gap-2.5 min-w-0">
									<Badge variant="outline" class="font-mono text-[9px] uppercase px-1.5 py-0 border-primary/25 bg-primary/5 text-primary tracking-wide">
										Round {output.round}
									</Badge>
									<span class="truncate text-foreground/90 font-medium font-mono text-xs">
										{output.model.providerId}/{output.model.modelId}
									</span>
								</div>
								
								<Badge 
									variant="outline" 
									class={cn(
										"text-[9px] uppercase px-2 py-0.5 rounded-full font-bold",
										output.status === 'completed'
											? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
											: output.status === 'failed'
												? "border-destructive/25 bg-destructive/5 text-destructive"
												: "border-primary/25 bg-primary/5 text-primary animate-pulse"
									)}
								>
									{output.status}
								</Badge>
							</Accordion.Trigger>
							<Accordion.Content class="p-0 border-t border-border/20 bg-muted/5">
								<ScrollArea class="max-h-96 w-full">
									<pre class="code-area p-4 text-foreground/85 whitespace-pre-wrap break-words">{output.error ?? output.text}</pre>
								</ScrollArea>
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			</div>
		{/if}
	</section>
</main>
