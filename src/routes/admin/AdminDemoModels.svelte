<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Loader2, AlertTriangle, RefreshCw, Cpu } from '@lucide/svelte';

	type CatalogModel = {
		id: string;
		name?: string;
		enabled: boolean;
	};

	type CatalogProvider = {
		id: string;
		name: string;
		enabled: boolean;
		logoUrl: string;
		models: CatalogModel[];
	};

	let {
		allowed = $bindable(),
		catalog,
		loading,
		error,
		retry
	}: {
		allowed: string[];
		catalog: CatalogProvider[];
		loading: boolean;
		error: string;
		retry: () => void;
	} = $props();

	function toggleAllowed(value: string) {
		allowed = allowed.includes(value)
			? allowed.filter((item) => item !== value)
			: [...allowed, value];
	}
</script>

<div class="space-y-4">
	<div>
		<h3 class="text-sm font-bold text-foreground">Demo allowed models</h3>
		<p class="text-xs text-muted-foreground/80 mt-0.5">Select which catalog models are accessible to demo role users</p>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<Loader2 class="size-8 text-primary animate-spin mb-3 stroke-[1.5]" />
			<p class="text-xs text-muted-foreground">Synchronizing provider model catalogs...</p>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center py-16 text-center border border-destructive/20 bg-destructive/5 rounded-xl p-6 space-y-4">
			<AlertTriangle class="size-8 text-destructive animate-bounce stroke-[1.5]" />
			<div class="space-y-1">
				<h4 class="text-sm font-bold text-destructive">Catalog loading failed</h4>
				<p class="text-xs text-muted-foreground/85 max-w-sm leading-relaxed">{error}</p>
			</div>
			<Button class="rounded-xl gap-2 font-semibold" type="button" variant="outline" onclick={retry}>
				<RefreshCw class="size-3.5" />
				Retry load
			</Button>
		</div>
	{:else}
		<ScrollArea class="max-h-[35rem] w-full">
			<div class="grid gap-4 pr-3 py-1">
				{#each catalog as provider (provider.id)}
					<div class="rounded-xl border border-border/25 bg-muted/5 p-4 space-y-4 transition-all duration-300 hover:border-primary/20">
						<!-- Provider Header -->
						<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/25">
							<div class="flex min-w-0 items-center gap-3">
								<div class="flex size-8 items-center justify-center rounded-lg bg-card border border-border/30 overflow-hidden shadow-sm shrink-0">
									<img class="size-5 object-contain" src={provider.logoUrl} alt="" />
								</div>
								<strong class="truncate text-sm font-bold text-foreground/95">{provider.name}</strong>
							</div>
							
							<Badge 
								variant="outline" 
								class={cn(
									"text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border shadow-sm",
									provider.enabled
										? "border-emerald-500/25 bg-emerald-500/5 text-emerald-400"
										: "border-border bg-muted/20 text-muted-foreground"
								)}
							>
								{provider.enabled ? 'Enabled' : 'Catalog only'}
							</Badge>
						</div>

						<!-- Models Selection Grid -->
						<div class="grid gap-2.5 sm:grid-cols-2">
							{#each provider.models as model (model.id)}
								{@const value = `${provider.id}/${model.id}`}
								{@const id = `demo-${provider.id}-${model.id}`}
								<div class={cn(
									"flex min-w-0 items-center gap-3.5 rounded-xl border border-transparent p-3 transition-all duration-200",
									allowed.includes(value)
										? "bg-primary/5 border-primary/20 shadow-sm"
										: "bg-muted/10 hover:bg-muted/20"
								)}>
									<Checkbox
										{id}
										checked={allowed.includes(value)}
										disabled={!model.enabled}
										onclick={() => toggleAllowed(value)}
										class="rounded-md border-border/60 data-[state=checked]:bg-primary"
									/>
									<Label class="min-w-0 flex-1 text-xs font-semibold text-foreground/85 flex items-center gap-1.5 cursor-pointer select-none" for={id}>
										<Cpu class={cn("size-3.5 shrink-0 transition-colors", allowed.includes(value) ? "text-primary" : "text-muted-foreground/60")} />
										<span class="truncate">{model.name ?? model.id}</span>
									</Label>
								</div>
							{:else}
								<p class="text-xs text-muted-foreground/60 p-2 col-span-2">No models available in this catalog.</p>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</ScrollArea>
	{/if}
</div>
