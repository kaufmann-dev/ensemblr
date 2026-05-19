<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>History | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-5xl px-4 py-6">
	<Card>
		<CardHeader><CardTitle>Generation history</CardTitle></CardHeader>
		<CardContent class="space-y-2">
			{#each data.generations as item (item.id)}
				<a
					class="grid gap-2 rounded-md border p-4 hover:bg-muted md:grid-cols-[1fr_auto]"
					href={resolve(`/history/${item.id}`)}
				>
					<span>
						<span class="block font-medium">{item.prompt.slice(0, 140)}</span>
						<span class="text-xs text-muted-foreground">{item.createdAt.toLocaleString()}</span>
					</span>
					<Badge variant={item.status === 'completed' ? 'secondary' : 'outline'}
						>{item.status}</Badge
					>
				</a>
			{:else}
				<p class="text-sm text-muted-foreground">No generations saved yet.</p>
			{/each}
		</CardContent>
	</Card>
</main>
