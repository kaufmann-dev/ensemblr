<script lang="ts">
	import { browser } from '$app/environment';
	import { cn } from '$lib/utils.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Accordion from '$lib/components/ui/accordion';
	import { 
		Copy, 
		Check, 
		Layers, 
		FileText, 
		ShieldCheck,
		Trash2
	} from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Generation = PageProps['data']['generation'];
	type GenerationOutput = PageProps['data']['outputs'][number];
	type StreamEvent =
		| { type: 'snapshot'; generation: Generation; outputs: GenerationOutput[] }
		| { type: 'generation'; generationId: string }
		| {
				type: 'status';
				outputId: string;
				phase: 'worker' | 'judge';
				round: number;
				model: { providerId: string; modelId: string };
				status: Generation['status'];
		  }
		| {
				type: 'text';
				outputId: string;
				phase: 'worker' | 'judge';
				round: number;
				model: { providerId: string; modelId: string };
				text: string;
		  }
		| {
				type: 'error';
				outputId?: string;
				phase: 'worker' | 'judge';
				round: number;
				model: { providerId: string; modelId: string };
				error: string;
		  }
		| { type: 'final'; generationId: string; text: string };
	type OutputStreamEvent =
		| Extract<StreamEvent, { type: 'status' }>
		| Extract<StreamEvent, { type: 'text' }>
		| (Extract<StreamEvent, { type: 'error' }> & { outputId: string });

	let liveGeneration = $state<Generation | undefined>();
	let liveOutputs = $state<GenerationOutput[] | undefined>();
	let generation = $derived(liveGeneration ?? data.generation);
	let outputs = $derived(liveOutputs ?? data.outputs);
	let copySuccess = $state(false);

	function upsertOutput(event: OutputStreamEvent) {
		const now = new Date();
		const existing = outputs.find((item) => item.id === event.outputId);
		if (existing) {
			liveOutputs = outputs.map((item) => {
				if (item.id !== event.outputId) return item;
				if (event.type === 'status') return { ...item, status: event.status, updatedAt: now };
				if (event.type === 'text') return { ...item, output: item.output + event.text, updatedAt: now };
				return { ...item, status: 'failed', error: event.error, updatedAt: now };
			});
			return;
		}

		const status = event.type === 'status' ? event.status : event.type === 'error' ? 'failed' : 'running';
		const output = event.type === 'text' ? event.text : '';
		const outputError = event.type === 'error' ? event.error : null;

		liveOutputs = [
			...outputs,
			{
				id: event.outputId,
				generationId: generation.id,
				phase: event.phase,
				round: event.round,
				providerId: event.model.providerId,
				modelId: event.model.modelId,
				status,
				output,
				error: outputError,
				createdAt: now,
				updatedAt: now
			}
		];
	}

	function applyStreamEvent(event: StreamEvent) {
		if (event.type === 'snapshot') {
			liveGeneration = event.generation;
			liveOutputs = event.outputs;
			return;
		}

		if (event.type === 'status' || event.type === 'text' || (event.type === 'error' && event.outputId)) {
			upsertOutput(event as OutputStreamEvent);
			if (event.type === 'text' && event.phase === 'judge') {
				liveGeneration = {
					...generation,
					finalOutput: `${generation.finalOutput ?? ''}${event.text}`,
					updatedAt: new Date()
				};
			}
			return;
		}

		if (event.type === 'error') {
			liveGeneration = { ...generation, status: 'failed', error: event.error, updatedAt: new Date() };
			return;
		}

		if (event.type === 'final') {
			liveGeneration = {
				...generation,
				status: 'completed',
				finalOutput: event.text,
				updatedAt: new Date()
			};
		}
	}

	function statusClass(status: Generation['status']) {
		return cn(
			"text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border tracking-wide ml-2.5",
			status === 'completed'
				? "border-border bg-foreground/5 text-foreground"
				: status === 'failed'
					? "border-destructive/30 bg-destructive/5 text-destructive"
					: "border-border bg-muted text-muted-foreground animate-pulse"
		);
	}

	function outputStatusClass(status: GenerationOutput['status']) {
		return cn(
			"text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-medium border shrink-0",
			status === 'completed'
				? "border-border bg-foreground/5 text-foreground"
				: status === 'failed'
					? "border-destructive/30 bg-destructive/5 text-destructive"
					: "border-border bg-muted text-muted-foreground animate-pulse"
		);
	}

	async function copyFinalOutput() {
		const text = generation.finalOutput ?? generation.error;
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			copySuccess = true;
			setTimeout(() => {
				copySuccess = false;
			}, 2000);
		} catch {
			// fallback
		}
	}

	function generationStream(node: HTMLElement, params: { generationId: string; running: boolean }) {
		if (!browser) return {};

		let source: EventSource | null = null;

		function connect() {
			if (!params.running || source) return;
			source = new EventSource(resolve(`/api/generations/${params.generationId}/events`));
			source.onmessage = (message) => {
				applyStreamEvent(JSON.parse(message.data));
			};
		}

		function disconnect() {
			if (source) {
				source.close();
				source = null;
			}
		}

		connect();

		return {
			update(newParams: typeof params) {
				params = newParams;
				if (params.running && !source) {
					connect();
				} else if (!params.running && source) {
					disconnect();
				}
			},
			destroy() {
				disconnect();
			}
		};
	}
</script>

<svelte:head><title>Saved generation | ensemblr</title></svelte:head>

{#key data.generation.id}
<main
	class="relative flex-1 flex flex-col justify-start max-w-5xl mx-auto w-full px-4 py-8 space-y-6 bg-background"
	use:generationStream={{ generationId: data.generation.id, running: generation.status === 'running' }}
>
	<PageHeader
		title="Saved generation"
		description="Review mixture configurations and generated LLM responses"
		backHref="/history"
	>
		{#snippet badge()}
			<span 
				class={statusClass(generation.status)}
			>
				{generation.status}
			</span>
		{/snippet}
	</PageHeader>

	<div class="flex justify-end px-1">
		<form method="POST" action={`${resolve('/history')}?/delete`}>
			<input type="hidden" name="id" value={generation.id} />
			<Button type="submit" variant="destructive" size="sm" class="h-7.5 rounded text-[10px]">
				<Trash2 class="size-3.5 mr-1" />
				Delete saved run
			</Button>
		</form>
	</div>

	<!-- Source Prompt Panel -->
	<Card class="border border-border bg-card rounded overflow-hidden">
		<CardHeader class="pb-3 pt-4 px-5 border-b border-border">
			<div class="flex items-center gap-2">
				<FileText class="size-3.5 text-foreground/80" />
				<CardTitle class="text-sm font-bold font-mono tracking-tight">Source prompt</CardTitle>
			</div>
		</CardHeader>
		<CardContent class="p-0 bg-muted/5">
			<ScrollArea class="max-h-52 w-full">
				<pre class="code-area p-5 text-foreground/80 break-words whitespace-pre-wrap select-text outline-none">{generation.prompt}</pre>
			</ScrollArea>
		</CardContent>
	</Card>

	<!-- Final Synthesis Output Panel -->
	<Card class="border border-border bg-card rounded overflow-hidden">
		<CardHeader class="pb-3 pt-4 px-5 border-b border-border flex flex-row items-center justify-between gap-4">
			<div class="flex items-center gap-2">
				<ShieldCheck class="size-4 text-foreground/80" />
				<div>
					<CardTitle class="text-sm font-bold font-mono tracking-tight">Synthesized output</CardTitle>
					<CardDescription class="text-[10px] font-mono text-muted-foreground mt-0.5">Final synthesized response</CardDescription>
				</div>
			</div>
			{#if generation.finalOutput || generation.error}
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
		<CardContent class="p-0 bg-muted/5">
			<ScrollArea class="max-h-[30rem] w-full">
				<pre class="code-area p-5 text-foreground whitespace-pre-wrap selection:bg-foreground/10 break-words select-text outline-none">{generation.finalOutput ?? generation.error ?? 'No final output saved.'}</pre>
			</ScrollArea>
		</CardContent>
	</Card>

	<!-- Worker Mixture Steps -->
	<div class="space-y-3">
		<div class="flex items-center gap-2 px-1">
			<Layers class="size-4 text-foreground/80" />
			<h3 class="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Worker Mixture Steps ({outputs.length})</h3>
		</div>

		<Accordion.Root type="multiple" class="w-full grid gap-2">
			{#each outputs as output (output.id)}
				<Accordion.Item value={output.id} class="rounded border border-border bg-card overflow-hidden">
					<Accordion.Trigger class="px-4 py-2.5 text-xs font-mono font-medium hover:no-underline hover:bg-muted/40 transition-colors flex items-center justify-between gap-4 min-w-0 w-full">
						<div class="flex items-center gap-2.5 min-w-0">
							<span class="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-border bg-muted text-muted-foreground tracking-wide rounded-sm whitespace-nowrap shrink-0">
								{output.phase} · Round {output.round}
							</span>
							<span class="truncate text-foreground/90 font-mono text-[11px]">
								{output.providerId}/{output.modelId}
							</span>
						</div>
						
						<span 
							class={outputStatusClass(output.status)}
						>
							{output.status}
						</span>
					</Accordion.Trigger>
					<Accordion.Content class="p-0 border-t border-border bg-muted/5">
						<ScrollArea class="max-h-96 w-full">
							<pre class="code-area p-4 text-foreground/85 whitespace-pre-wrap break-words bg-muted/10 selection:bg-foreground/10 outline-none">{output.error ?? output.output}</pre>
						</ScrollArea>
					</Accordion.Content>
				</Accordion.Item>
			{:else}
				<div class="border border-dashed border-border rounded bg-card/40 p-6 text-center text-xs font-mono text-muted-foreground">
					No detailed step outputs were archived for this run.
				</div>
			{/each}
		</Accordion.Root>
	</div>
</main>
{/key}
