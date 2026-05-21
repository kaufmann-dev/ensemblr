<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import * as Accordion from '$lib/components/ui/accordion';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Saved generation | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-5xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex flex-wrap items-center gap-3">
				Saved generation
				<Badge variant="secondary">{data.generation.status}</Badge>
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<ScrollArea class="max-h-80 rounded-md bg-muted">
				<pre class="max-w-full overflow-x-auto p-4 text-sm break-words whitespace-pre-wrap">{data
						.generation.prompt}</pre>
			</ScrollArea>
			<ScrollArea class="max-h-[34rem] rounded-md bg-muted">
				<pre
					class="min-h-56 max-w-full overflow-x-auto p-4 text-sm break-words whitespace-pre-wrap">{data
						.generation.finalOutput ??
						data.generation.error ??
						'No final output saved.'}</pre>
			</ScrollArea>
		</CardContent>
	</Card>

	<Accordion.Root type="multiple" class="min-w-0">
		{#each data.outputs as output (output.id)}
			<Accordion.Item value={output.id}>
				<Accordion.Trigger class="min-w-0 text-left">
					<span class="min-w-0 break-words">
						{output.phase} · round {output.round} · {output.providerId}/{output.modelId} · {output.status}
					</span>
				</Accordion.Trigger>
				<Accordion.Content>
					<ScrollArea class="max-h-96 rounded-md bg-muted">
						<pre
							class="max-w-full overflow-x-auto p-4 text-sm break-words whitespace-pre-wrap">{output.error ??
								output.output}</pre>
					</ScrollArea>
				</Accordion.Content>
			</Accordion.Item>
		{:else}
			<Card>
				<CardContent class="p-4 text-sm text-muted-foreground">
					No model output has been saved for this run yet.
				</CardContent>
			</Card>
		{/each}
	</Accordion.Root>
</main>
