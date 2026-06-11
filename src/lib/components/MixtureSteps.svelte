<script lang="ts" module>
	export type MixtureStep = {
		key: string;
		phase: 'worker' | 'judge';
		round: number;
		providerId: string;
		modelId: string;
		status: string;
		text: string;
		error?: string | null;
	};
</script>

<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion';
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import Markdown from '$lib/markdown/Markdown.svelte';

	let {
		steps,
		streaming = false
	}: {
		steps: MixtureStep[];
		streaming?: boolean;
	} = $props();
</script>

<Accordion.Root type="multiple" class="grid w-full gap-2">
	{#each steps as step (step.key)}
		<Accordion.Item
			value={step.key}
			class="overflow-hidden rounded-md border border-border bg-card"
		>
			<Accordion.Trigger
				class="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-2.5 text-sm hover:bg-muted/40 hover:no-underline"
			>
				<div class="flex min-w-0 items-center gap-2.5">
					<span
						class="shrink-0 rounded-sm border border-border bg-muted px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground"
					>
						{step.phase === 'judge' ? 'Judge' : 'Worker'} · Round {step.round}
					</span>
					<span
						class="truncate text-xs text-foreground/90"
						style:font-variation-settings="'MONO' 1"
					>
						{step.providerId}/{step.modelId}
					</span>
				</div>
				<GenerationStatus status={step.status} compact class="shrink-0" />
			</Accordion.Trigger>
			<Accordion.Content class="border-t border-border bg-muted/5 p-0">
				<div class="max-h-96 w-full overflow-y-auto p-4" tabindex="-1">
					{#if step.error}
						<p class="text-sm break-words text-destructive">{step.error}</p>
					{:else}
						<Markdown text={step.text} streaming={streaming && step.status === 'running'} />
					{/if}
				</div>
			</Accordion.Content>
		</Accordion.Item>
	{/each}
</Accordion.Root>
