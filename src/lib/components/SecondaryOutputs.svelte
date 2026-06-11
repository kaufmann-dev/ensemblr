<script lang="ts">
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import MarkdownOutput from '$lib/markdown/MarkdownOutput.svelte';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Layers } from '@lucide/svelte';

	type SecondaryOutput = {
		key: string;
		phase: 'worker' | 'judge';
		round: number;
		model: { providerId: string; modelId: string };
		status: string;
		text: string;
		error?: string;
	};

	let { outputs }: { outputs: SecondaryOutput[] } = $props();
</script>

{#if outputs.length > 0}
	<section class="space-y-3" aria-labelledby="supporting-outputs-heading">
		<div class="flex items-center gap-2 px-1">
			<Layers class="size-4 text-muted-foreground" />
			<h2 id="supporting-outputs-heading" class="text-sm font-semibold text-foreground">
				Supporting responses
			</h2>
			<span class="text-xs text-muted-foreground">({outputs.length})</span>
		</div>

		<Accordion.Root type="multiple" class="grid w-full gap-2">
			{#each outputs as output (output.key)}
				<Accordion.Item
					value={output.key}
					class="overflow-hidden rounded border border-border bg-card"
				>
					<Accordion.Trigger
						class="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-3 text-xs font-medium transition-colors hover:bg-muted/40 hover:no-underline"
					>
						<div class="flex min-w-0 items-center gap-2.5">
							<span class="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
								{output.phase === 'worker' ? 'Worker' : 'Intermediate judge'} · Round {output.round}
							</span>
							<span class="truncate font-mono text-[11px] text-foreground/80">
								{output.model.providerId}/{output.model.modelId}
							</span>
						</div>
						<GenerationStatus status={output.status} class="shrink-0" />
					</Accordion.Trigger>
					<Accordion.Content class="border-t border-border bg-muted/5 p-0">
						<div class="max-h-96 w-full overflow-y-auto" tabindex="-1">
							<MarkdownOutput source={output.error ?? output.text} class="p-4" />
						</div>
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	</section>
{/if}
