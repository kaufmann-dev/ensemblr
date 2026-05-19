<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>Saved generation | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-5xl space-y-4 px-4 py-6">
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-3">
				Saved generation
				<Badge variant="secondary">{data.generation.status}</Badge>
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<pre class="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">{data.generation
					.prompt}</pre>
			<pre class="min-h-56 rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">{data.generation
					.finalOutput ??
					data.generation.error ??
					'No final output saved.'}</pre>
		</CardContent>
	</Card>

	<Accordion.Root type="multiple">
		{#each data.outputs as output (output.id)}
			<Accordion.Item value={output.id}>
				<Accordion.Trigger>
					{output.phase} · round {output.round} · {output.providerId}/{output.modelId} · {output.status}
				</Accordion.Trigger>
				<Accordion.Content>
					<pre class="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">{output.error ??
							output.output}</pre>
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</main>
