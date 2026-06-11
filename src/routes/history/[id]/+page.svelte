<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import AssistantMessage from '$lib/components/conversation/AssistantMessage.svelte';
	import UserMessage from '$lib/components/conversation/UserMessage.svelte';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import MixtureSteps, { type MixtureStep } from '$lib/components/MixtureSteps.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { getHistoryContext } from '$lib/history/history.svelte';
	import { Trash2 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const history = getHistoryContext();

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
	let isRunning = $derived(generation.status === 'running');

	let workerSteps = $derived<MixtureStep[]>(
		outputs
			.filter((output) => output.phase === 'worker')
			.map((output) => ({
				key: output.id,
				phase: output.phase,
				round: output.round,
				providerId: output.providerId,
				modelId: output.modelId,
				status: output.status,
				text: output.output,
				error: output.error
			}))
	);

	// Keep the shared sidebar history in sync with live status changes.
	$effect(() => {
		history.setStatus(generation.id, generation.status);
	});

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
		class="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8"
		use:generationStream={{ generationId: data.generation.id, running: isRunning }}
	>
		<PageHeader
			title="Saved generation"
			description="Created {new Date(data.generation.createdAt).toLocaleString()}"
			backHref="/history"
		>
			{#snippet badge()}
				<GenerationStatus status={generation.status} class="ml-1" />
			{/snippet}
			{#snippet actions()}
				<form
					method="POST"
					action={`${resolve('/history')}?/delete`}
					use:enhance={() =>
						({ update }) => {
							history.remove(generation.id);
							return update();
						}}
				>
					<input type="hidden" name="id" value={generation.id} />
					<Button type="submit" variant="destructive" size="sm">
						<Trash2 class="size-3.5" />
						Delete
					</Button>
				</form>
			{/snippet}
		</PageHeader>

		<UserMessage text={generation.prompt} />

		{#if generation.finalOutput || generation.error || isRunning}
			<AssistantMessage
				text={generation.finalOutput ?? ''}
				error={generation.error ?? undefined}
				streaming={isRunning}
			/>
		{:else}
			<p class="text-sm text-muted-foreground">No final output was saved for this run.</p>
		{/if}

		{#if workerSteps.length > 0}
			<section class="space-y-2" aria-label="Mixture steps">
				<h2 class="text-xs font-medium text-muted-foreground">
					Mixture steps ({workerSteps.length})
				</h2>
				<MixtureSteps steps={workerSteps} streaming={isRunning} />
			</section>
		{:else}
			<p
				class="rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground"
			>
				No detailed step outputs were archived for this run.
			</p>
		{/if}
	</main>
{/key}
