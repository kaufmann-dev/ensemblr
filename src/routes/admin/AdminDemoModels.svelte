<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Loader2, AlertTriangle, RefreshCw, Cpu, Search, X } from '@lucide/svelte';

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

	let searchQuery = $state('');
	let visibleCount = $state(8);
	let scrollViewport = $state<HTMLElement | null>(null);

	// Derived filtered list of providers and models
	let filteredCatalog = $derived.by(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return catalog;

		return catalog
			.map((provider) => {
				const matchesProvider =
					provider.name.toLowerCase().includes(query) || provider.id.toLowerCase().includes(query);

				// If provider matches, keep all its models. Otherwise, filter models.
				const matchedModels = matchesProvider
					? provider.models
					: provider.models.filter(
							(model) =>
								(model.name && model.name.toLowerCase().includes(query)) ||
								model.id.toLowerCase().includes(query)
						);

				if (matchedModels.length > 0) {
					return {
						...provider,
						models: matchedModels
					};
				}
				return null;
			})
			.filter((provider): provider is CatalogProvider => provider !== null);
	});

	// Get total count of currently filtered models
	let filteredModelsCount = $derived(
		filteredCatalog.reduce((acc, provider) => acc + provider.models.length, 0)
	);

	// Slice catalog to only render the visibleCount amount of providers
	let visibleCatalog = $derived(filteredCatalog.slice(0, visibleCount));

	function toggleAllowed(value: string) {
		allowed = allowed.includes(value)
			? allowed.filter((item) => item !== value)
			: [...allowed, value];
	}

	$effect(() => {
		// Reset visible count when searchQuery changes
		searchQuery;
		visibleCount = 8;
	});

	$effect(() => {
		const el = scrollViewport;
		if (!el) return;

		function handleScroll() {
			if (!el) return;
			const threshold = 250; // trigger loading a bit early for smooth scrolling
			const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
			if (isNearBottom && visibleCount < filteredCatalog.length) {
				visibleCount = Math.min(visibleCount + 8, filteredCatalog.length);
			}
		}

		el.addEventListener('scroll', handleScroll, { passive: true });
		// Initial check in case it's already near the bottom on render
		handleScroll();

		return () => {
			el.removeEventListener('scroll', handleScroll);
		};
	});
</script>

<div class="space-y-4">
	<div>
		<h3 class="text-xs font-bold font-mono text-foreground uppercase tracking-tight">Demo allowed models</h3>
		<p class="text-xs font-mono text-muted-foreground/80 mt-0.5">Select which catalog models are accessible to demo role users</p>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<Loader2 class="size-6 text-foreground/75 animate-spin mb-3 stroke-[1.5]" />
			<p class="text-xs font-mono text-muted-foreground">Synchronizing provider model catalogs...</p>
		</div>
	{:else if error}
		<div class="flex flex-col items-center justify-center py-16 text-center border border-destructive/20 bg-destructive/5 rounded p-6 space-y-4">
			<AlertTriangle class="size-6 text-destructive stroke-[1.5]" />
			<div class="space-y-1">
				<h4 class="text-xs font-bold font-mono text-destructive uppercase tracking-tight">Catalog loading failed</h4>
				<p class="text-xs font-mono text-muted-foreground/85 max-w-sm leading-relaxed">{error}</p>
			</div>
			<Button class="rounded border border-border bg-card px-4 h-9 font-mono text-xs uppercase tracking-wider font-bold text-foreground hover:bg-muted gap-2 shadow-none" type="button" onclick={retry}>
				<RefreshCw class="size-3.5" />
				Retry load
			</Button>
		</div>
	{:else}
		<!-- Search & Stats Bar -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1">
			<div class="relative w-full sm:max-w-xs">
				<Search class="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/70" />
				<Input
					type="text"
					placeholder="Search providers or models..."
					bind:value={searchQuery}
					class="h-8.5 pl-8 pr-8 text-xs rounded border border-border focus-visible:ring-1 focus-visible:ring-foreground/20 font-mono w-full"
				/>
				{#if searchQuery}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						class="absolute right-1.5 top-1/2 size-5 -translate-y-1/2 rounded text-muted-foreground/60 hover:text-foreground active:scale-95 transition-all"
						onclick={() => searchQuery = ''}
						aria-label="Clear search"
					>
						<X class="size-3" />
					</Button>
				{/if}
			</div>

			<!-- Dynamic stats badge -->
			<div class="text-[10px] font-mono text-muted-foreground self-start sm:self-center">
				{#if searchQuery}
					Found <span class="font-bold text-foreground">{filteredModelsCount}</span> models across <span class="font-bold text-foreground">{filteredCatalog.length}</span> providers
				{:else}
					Catalog: <span class="font-bold text-foreground">{filteredModelsCount}</span> models across <span class="font-bold text-foreground">{filteredCatalog.length}</span> providers
				{/if}
			</div>
		</div>

		{#if filteredCatalog.length === 0}
			<div class="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded bg-muted/10">
				<Cpu class="size-7 text-muted-foreground/30 mb-2 stroke-[1.5]" />
				<p class="text-xs font-mono text-muted-foreground">No matching models or providers found.</p>
				<Button 
					variant="ghost" 
					class="mt-2 h-7 rounded text-[10px] font-mono hover:bg-muted text-muted-foreground hover:text-foreground"
					onclick={() => searchQuery = ''}
				>
					Clear search filter
				</Button>
			</div>
		{:else}
			<ScrollArea class="max-h-[35rem] w-full" bind:viewportRef={scrollViewport}>
				<div class="grid gap-4 pr-3 py-1">
					{#each visibleCatalog as provider (provider.id)}
						<div class="rounded border border-border bg-muted/20 p-4 space-y-4 hover:border-foreground/30">
							<!-- Provider Header -->
							<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
								<div class="flex min-w-0 items-center gap-3">
									<div class="flex size-7 items-center justify-center rounded bg-card border border-border overflow-hidden shrink-0">
										<img class="size-4 object-contain filter grayscale dark:invert" src={provider.logoUrl} alt="" />
									</div>
									<strong class="truncate text-xs font-bold font-mono uppercase tracking-tight text-foreground">{provider.name}</strong>
								</div>
								
								<Badge 
									variant="outline" 
									class={cn(
										"text-[9px] uppercase font-bold font-mono px-2 py-0.5 rounded border shadow-none tracking-wider",
										provider.enabled
											? "border-border bg-foreground/5 text-foreground"
											: "border-border/60 bg-muted/10 text-muted-foreground"
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
										"flex min-w-0 items-center gap-3 rounded border p-2.5",
										allowed.includes(value)
											? "bg-foreground/5 border-foreground/30 shadow-none"
											: "bg-muted/20 border-border hover:bg-muted/50 hover:border-foreground/20"
									)}>
										<Checkbox
											{id}
											checked={allowed.includes(value)}
											disabled={!model.enabled}
											onclick={() => toggleAllowed(value)}
											class="rounded border-border/60 data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:border-foreground focus-visible:ring-1 focus-visible:ring-foreground"
										/>
										<Label class="min-w-0 flex-1 text-[11px] font-mono font-semibold text-foreground/85 flex items-center gap-1.5 cursor-pointer select-none" for={id}>
											<Cpu class={cn("size-3.5 shrink-0 transition-colors", allowed.includes(value) ? "text-foreground" : "text-muted-foreground/60")} />
											<span class="truncate">{model.name ?? model.id}</span>
										</Label>
									</div>
								{:else}
									<p class="text-xs font-mono text-muted-foreground/60 p-2 col-span-2">No models available in this catalog.</p>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</ScrollArea>
		{/if}
	{/if}
</div>
