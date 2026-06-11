<script lang="ts">
	import { browser } from '$app/environment';
	import { fromAction } from 'svelte/attachments';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import MarkdownOutput from '$lib/markdown/MarkdownOutput.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Copy, Check, Layers, FileText, ShieldCheck, Trash2 } from '@lucide/svelte';
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
				if (event.type === 'text')
					return { ...item, output: item.output + event.text, updatedAt: now };
				return { ...item, status: 'failed', error: event.error, updatedAt: now };
			});
			return;
		}

		const status =
			event.type === 'status' ? event.status : event.type === 'error' ? 'failed' : 'running';
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

		if (
			event.type === 'status' ||
			event.type === 'text' ||
			(event.type === 'error' && event.outputId)
		) {
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
			liveGeneration = {
				...generation,
				status: 'failed',
				error: event.error,
				updatedAt: new Date()
			};
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
		class="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-start space-y-6 bg-background px-4 py-8"
		{@attach fromAction(generationStream, () => ({
			generationId: data.generation.id,
			running: generation.status === 'running'
		}))}
	>
		<PageHeader
			title="Saved generation"
			description="Review mixture configurations and generated LLM responses"
			backHref="/history"
		>
			{#snippet badge()}
				<GenerationStatus status={generation.status} class="ml-2.5" />
			{/snippet}
		</PageHeader>

		<div class="flex justify-end px-1">
			<form method="POST" action={`${resolve('/history')}?/delete`}>
				<input type="hidden" name="id" value={generation.id} />
				<Button type="submit" variant="destructive" size="sm" class="h-7.5 rounded text-[10px]">
					<Trash2 class="mr-1 size-3.5" />
					Delete saved run
				</Button>
			</form>
		</div>

		<!-- Source Prompt Panel -->
		<Card class="overflow-hidden rounded border border-border bg-card">
			<CardHeader class="border-b border-border px-5 pt-4 pb-3">
				<div class="flex items-center gap-2">
					<FileText class="size-3.5 text-foreground" />
					<CardTitle class="font-mono text-sm font-bold tracking-tight">Source prompt</CardTitle>
				</div>
			</CardHeader>
			<CardContent class="bg-muted/5 p-0">
				<div class="max-h-52 w-full overflow-y-auto" tabindex="-1">
					<MarkdownOutput source={generation.prompt} class="p-5" />
				</div>
			</CardContent>
		</Card>

		<!-- Final Synthesis Output Panel -->
		<Card class="overflow-hidden rounded border border-border bg-card">
			<CardHeader
				class="flex flex-row items-center justify-between gap-4 border-b border-border px-5 pt-4 pb-3"
			>
				<div class="flex items-center gap-2">
					<ShieldCheck class="size-4 text-foreground" />
					<div>
						<CardTitle class="font-mono text-sm font-bold tracking-tight"
							>Synthesized output</CardTitle
						>
						<CardDescription class="mt-0.5 font-mono text-[10px] text-muted-foreground"
							>Final synthesized response</CardDescription
						>
					</div>
				</div>
				{#if generation.finalOutput || generation.error}
					<Button
						variant="ghost"
						size="icon"
						onclick={copyFinalOutput}
						class="size-7 rounded text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
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
			<CardContent class="bg-muted/5 p-0">
				<div class="max-h-[30rem] w-full overflow-y-auto" tabindex="-1">
					<MarkdownOutput
						source={generation.finalOutput ?? generation.error ?? 'No final output saved.'}
						class="p-5"
					/>
				</div>
			</CardContent>
		</Card>

		<!-- Worker Mixture Steps -->
		<div class="space-y-3">
			<div class="flex items-center gap-2 px-1">
				<Layers class="size-4 text-foreground" />
				<h3 class="font-mono text-xs font-bold tracking-widest text-muted-foreground/90 uppercase">
					Worker Mixture Steps ({outputs.length})
				</h3>
			</div>

			<Accordion.Root type="multiple" class="grid w-full gap-2">
				{#each outputs as output (output.id)}
					<Accordion.Item
						value={output.id}
						class="overflow-hidden rounded border border-border bg-card"
					>
						<Accordion.Trigger
							class="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-2.5 font-mono text-xs font-medium transition-colors hover:bg-muted/40 hover:no-underline"
						>
							<div class="flex min-w-0 items-center gap-2.5">
								<span
									class="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-wide whitespace-nowrap text-muted-foreground uppercase"
								>
									{output.phase} · Round {output.round}
								</span>
								<span class="truncate font-mono text-[11px] text-foreground/90">
									{output.providerId}/{output.modelId}
								</span>
							</div>

							<GenerationStatus status={output.status} class="shrink-0" />
						</Accordion.Trigger>
						<Accordion.Content class="border-t border-border bg-muted/5 p-0">
							<div class="max-h-96 w-full overflow-y-auto" tabindex="-1">
								<MarkdownOutput source={output.error ?? output.output} class="bg-muted/10 p-4" />
							</div>
						</Accordion.Content>
					</Accordion.Item>
				{:else}
					<div
						class="border border-dashed border-border rounded bg-card/40 p-6 text-center text-xs font-mono text-muted-foreground"
					>
						No detailed step outputs were archived for this run.
					</div>
				{/each}
			</Accordion.Root>
		</div>
	</main>
{/key}
