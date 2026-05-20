<script lang="ts">
	import { resolve } from '$app/paths';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>History | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-6">
	<Card>
		<CardHeader><CardTitle>Generation history</CardTitle></CardHeader>
		<CardContent class="space-y-2">
			{#each data.generations as item (item.id)}
				<a
					class="grid min-w-0 gap-3 rounded-md border p-3 hover:bg-muted sm:p-4 md:grid-cols-[minmax(0,1fr)_auto]"
					href={resolve(`/history/${item.id}`)}
				>
					<span class="min-w-0">
						<span class="line-clamp-3 font-medium break-words">{item.prompt.slice(0, 180)}</span>
						<span class="text-xs text-muted-foreground">{item.createdAt.toLocaleString()}</span>
					</span>
					<Badge class="w-fit" variant={item.status === 'completed' ? 'secondary' : 'outline'}
						>{item.status}</Badge
					>
				</a>
			{:else}
				<p class="text-sm text-muted-foreground">No generations saved yet.</p>
			{/each}
		</CardContent>
	</Card>
</main>
