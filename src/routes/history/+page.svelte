<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { History, Activity, Calendar, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>History | ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-4xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<PageHeader
		title="Generation history"
		description="Inspect historical Mixture-of-Agents synthesis runs"
		icon={History}
	/>

	<div class="space-y-2 px-1">
			{#each data.generations as item (item.id)}
				<a
					class="group block relative rounded border border-border bg-muted/20 p-4 hover:bg-muted/50 hover:border-foreground/30 min-w-0"
					href={resolve(`/history/${item.id}`)}
				>
					<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
						<div class="space-y-2 min-w-0 flex-1">
							<p class="line-clamp-2 font-mono text-xs text-foreground/80 group-hover:text-foreground break-words leading-relaxed">
								{item.prompt}
							</p>
							<div class="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
								<span class="flex items-center gap-1">
									<Calendar class="size-3 text-muted-foreground/60" />
									<span class="font-mono tabular-nums text-[9px]">{new Date(item.createdAt).toLocaleString()}</span>
								</span>
								<span class="font-mono text-[9px] lowercase bg-card px-1.5 py-0.5 rounded border border-border">
									id: {item.id.slice(0, 8)}...
								</span>
							</div>
						</div>

						<div class="shrink-0 flex items-center">
							<span 
								class={cn(
									"text-[9px] font-mono font-medium uppercase px-1.5 py-0.5 rounded border tracking-wide",
									item.status === 'completed'
										? "border-border bg-foreground/5 text-foreground"
										: "border-destructive/30 bg-destructive/5 text-destructive"
								)}
							>
								{item.status}
							</span>
						</div>
					</div>
				</a>
			{:else}
				<div class="flex flex-col items-center justify-center py-20 text-center">
					<History class="size-7 text-muted-foreground/30 mb-2 stroke-[1.5]" />
					<h3 class="text-xs font-mono font-bold text-foreground">Archive Empty</h3>
					<p class="text-[10px] font-mono text-muted-foreground mt-1 max-w-xs leading-relaxed">
						You haven't run any Mixture-of-Agents generations yet. Go to the Workspace dashboard to trigger your first run!
					</p>
				</div>
			{/each}
		</div>
	</main>
