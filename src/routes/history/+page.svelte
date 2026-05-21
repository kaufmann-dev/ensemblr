<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { History, Activity, Calendar, Sparkles } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>History | Ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-4xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<!-- Glowing accent background orb -->
	<div class="absolute top-[15%] right-[20%] -z-10 size-[22rem] rounded-full bg-cyan-400/5 blur-[90px]"></div>

	<div class="flex items-center gap-3 px-1">
		<div class="flex size-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
			<History class="size-4.5" />
		</div>
		<div>
			<h1 class="text-xl font-bold tracking-tight text-foreground">Generation history</h1>
			<p class="text-xs text-muted-foreground/85">Inspect and review your historical Mixture-of-Agents synthesis runs</p>
		</div>
	</div>

	<Card class="glass-panel border-border/30 premium-glow-cyan">
		<CardContent class="space-y-3 pt-5 pb-5">
			{#each data.generations as item (item.id)}
				<a
					class="group block relative rounded-xl border border-border/25 bg-muted/5 p-4 sm:p-5 transition-all duration-300 hover:bg-muted/10 hover:border-cyan-500/30 hover:shadow-md hover:scale-[0.995] active:scale-[0.985] min-w-0"
					href={resolve(`/history/${item.id}`)}
				>
					<div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
						<div class="space-y-2 min-w-0 flex-1">
							<p class="line-clamp-3 font-semibold text-sm text-foreground/90 group-hover:text-foreground break-words leading-relaxed">
								{item.prompt}
							</p>
							<div class="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground/75 font-semibold uppercase tracking-wider">
								<span class="flex items-center gap-1">
									<Calendar class="size-3 text-muted-foreground/50" />
									<span class="font-mono tabular-nums">{new Date(item.createdAt).toLocaleString()}</span>
								</span>
								<span class="flex items-center gap-1 font-mono text-[9px] lowercase bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/10">
									ID: {item.id.slice(0, 8)}...
								</span>
							</div>
						</div>

						<div class="shrink-0 flex items-center">
							<Badge 
								variant="outline"
								class={cn(
									"text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border shadow-sm",
									item.status === 'completed'
										? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
										: "border-amber-500/25 bg-amber-500/5 text-amber-400"
								)}
							>
								{item.status}
							</Badge>
						</div>
					</div>
				</a>
			{:else}
				<div class="flex flex-col items-center justify-center py-20 text-center">
					<History class="size-10 text-muted-foreground/30 mb-3 stroke-[1.2] animate-pulse" />
					<h3 class="text-sm font-bold text-foreground/90">Archive Empty</h3>
					<p class="text-xs text-muted-foreground/80 mt-1 max-w-xs leading-relaxed">
						You haven't run any Mixture-of-Agents generations yet. Go to the Workspace dashboard to trigger your first run!
					</p>
				</div>
			{/each}
		</CardContent>
	</Card>
</main>
