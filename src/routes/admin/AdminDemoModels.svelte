<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
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
	type ActivationFilter = 'all' | 'activated' | 'not-activated';
	const activationOptions: { value: ActivationFilter; label: string }[] = [
		{ value: 'all', label: 'All' },
		{ value: 'activated', label: 'Activated' },
		{ value: 'not-activated', label: 'Not activated' }
	];

	let {
		allowed = $bindable(),
		catalog,
		loading,
		error,
		retry,
		onSelectionChange
	}: {
		allowed: string[];
		catalog: CatalogProvider[];
		loading: boolean;
		error: string;
		retry: () => void;
		onSelectionChange: (allowed: string[]) => void;
	} = $props();
	let activationFilter = $state<ActivationFilter>('all');

	// Flatten catalog structures into a single flat array of model entries
	type FlatModelRow = {
		providerId: string;
		providerName: string;
		providerLogoUrl: string;
		providerEnabled: boolean;
		modelId: string;
		modelName: string;
		modelEnabled: boolean;
		value: string; // providerId/modelId
		id: string; // demo-providerId-modelId
	};

	let flatModels = $derived.by(() => {
		const rows: FlatModelRow[] = [];
		if (!catalog) return rows;
		for (const provider of catalog) {
			for (const model of provider.models) {
				rows.push({
					providerId: provider.id,
					providerName: provider.name,
					providerLogoUrl: provider.logoUrl,
					providerEnabled: provider.enabled,
					modelId: model.id,
					modelName: model.name ?? model.id,
					modelEnabled: model.enabled,
					value: `${provider.id}/${model.id}`,
					id: `demo-${provider.id}-${model.id}`
				});
			}
		}
		return rows;
	});

	// Input and debounced search state
	let providerInput = $state('');
	let providerSearch = $state('');
	let providerDebounce: ReturnType<typeof setTimeout>;

	function handleProviderInput(val: string) {
		providerInput = val;
		clearTimeout(providerDebounce);
		providerDebounce = setTimeout(() => {
			providerSearch = val;
			resetLimitAndScroll();
		}, 150);
	}

	let modelInput = $state('');
	let modelSearch = $state('');
	let modelDebounce: ReturnType<typeof setTimeout>;

	function handleModelInput(val: string) {
		modelInput = val;
		clearTimeout(modelDebounce);
		modelDebounce = setTimeout(() => {
			modelSearch = val;
			resetLimitAndScroll();
		}, 150);
	}

	// Derived Set for O(1) allowed checkups
	let allowedSet = $derived(new Set(allowed));
	let catalogValueSet = $derived(new Set(flatModels.map((item) => item.value)));
	let enabledCatalogValueSet = $derived(
		new Set(flatModels.filter((item) => item.modelEnabled).map((item) => item.value))
	);
	let staleAllowed = $derived(allowed.filter((value) => !catalogValueSet.has(value)));
	let unavailableAllowed = $derived(
		flatModels.filter((item) => allowedSet.has(item.value) && !item.modelEnabled)
	);
	let submittedAllowed = $derived(
		loading || error ? allowed : allowed.filter((value) => enabledCatalogValueSet.has(value))
	);

	// Filtered list using both queries independently
	let filteredModels = $derived.by(() => {
		const pQuery = providerSearch.trim().toLowerCase();
		const mQuery = modelSearch.trim().toLowerCase();
		return flatModels.filter((item) => {
			const matchActivation =
				activationFilter === 'all' ||
				(activationFilter === 'activated' && allowedSet.has(item.value)) ||
				(activationFilter === 'not-activated' && !allowedSet.has(item.value));
			const matchProvider =
				!pQuery ||
				item.providerName.toLowerCase().includes(pQuery) ||
				item.providerId.toLowerCase().includes(pQuery);
			const matchModel =
				!mQuery ||
				item.modelName.toLowerCase().includes(mQuery) ||
				item.modelId.toLowerCase().includes(mQuery);
			return matchActivation && matchProvider && matchModel;
		});
	});

	let limit = $state(50);
	let loadingMore = $state(false);
	let scrollViewport = $state<HTMLElement | null>(null);

	// Slice current list for rendering
	let visibleModels = $derived(filteredModels.slice(0, limit));

	function toggleAllowed(value: string) {
		const nextAllowed = allowedSet.has(value)
			? allowed.filter((item) => item !== value)
			: [...allowed, value];
		allowed = nextAllowed;
		onSelectionChange(nextAllowed.filter((item) => enabledCatalogValueSet.has(item)));
	}

	function resetLimitAndScroll() {
		limit = 50;
		if (scrollViewport) {
			scrollViewport.scrollTop = 0;
		}
	}

	function loadMore() {
		if (loadingMore) return;
		if (limit >= filteredModels.length) return;
		loadingMore = true;
		limit = Math.min(limit + 50, filteredModels.length);
		setTimeout(() => {
			loadingMore = false;
		}, 100);
	}

	function handleScroll() {
		loadMore();
	}

	function infiniteScroll(node: HTMLElement, callback: () => void) {
		const threshold = 300;

		function check() {
			const isNearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < threshold;
			if (isNearBottom) {
				callback();
			}
		}

		function onScroll() {
			check();
		}

		const resizeObserver = new ResizeObserver(() => {
			check();
		});
		resizeObserver.observe(node);

		node.addEventListener('scroll', onScroll, { passive: true });

		requestAnimationFrame(check);

		return {
			destroy() {
				node.removeEventListener('scroll', onScroll);
				resizeObserver.disconnect();
			}
		};
	}
</script>

<div class="space-y-4">
	{#each submittedAllowed as model (model)}
		<input type="hidden" name="demoAllowedModels" value={model} />
	{/each}

	<div>
		<h3 class="font-mono text-xs font-bold tracking-tight text-foreground uppercase">
			Demo allowed models
		</h3>
		<p class="mt-0.5 font-mono text-xs text-muted-foreground/80">
			Select which catalog models are accessible to demo role users
		</p>
	</div>

	{#if loading}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<Loader2 class="mb-3 inline-block size-6 animate-spin stroke-[1.5] text-foreground" />
			<p class="font-mono text-xs text-muted-foreground">
				Synchronizing provider model catalogs...
			</p>
		</div>
	{:else}
		<!-- Search & Stats Bar -->
		<div class="flex flex-col gap-3 pb-1">
			<div
				class="grid w-full grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center"
			>
				<!-- Provider Search -->
				<div class="relative w-full">
					<Search
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Search providers..."
						value={providerInput}
						oninput={(e) => handleProviderInput(e.currentTarget.value)}
						class="w-full pr-8 pl-8 font-mono text-xs"
					/>
					{#if providerInput}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							class="absolute top-1/2 right-1.5 size-5 -translate-y-1/2 rounded text-muted-foreground transition-all hover:text-foreground active:scale-95"
							onclick={() => handleProviderInput('')}
							aria-label="Clear provider search"
						>
							<X class="size-3" />
						</Button>
					{/if}
				</div>

				<!-- Model Search -->
				<div class="relative w-full">
					<Search
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						type="text"
						placeholder="Search models..."
						value={modelInput}
						oninput={(e) => handleModelInput(e.currentTarget.value)}
						class="w-full pr-8 pl-8 font-mono text-xs"
					/>
					{#if modelInput}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							class="absolute top-1/2 right-1.5 size-5 -translate-y-1/2 rounded text-muted-foreground/60 transition-all hover:text-foreground active:scale-95"
							onclick={() => handleModelInput('')}
							aria-label="Clear model search"
						>
							<X class="size-3" />
						</Button>
					{/if}
				</div>

				<div
					class="inline-flex h-8.5 w-full rounded border border-border bg-card p-0.5 md:w-auto md:justify-self-start"
				>
					{#each activationOptions as option (option.value)}
						<button
							type="button"
							class={cn(
								'h-7 flex-1 rounded-sm px-3.5 font-mono text-xs transition-colors md:flex-initial',
								activationFilter === option.value
									? 'bg-foreground/15 text-foreground'
									: 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
							)}
							aria-pressed={activationFilter === option.value}
							onclick={() => {
								activationFilter = option.value;
								resetLimitAndScroll();
							}}
						>
							{option.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<!-- Dynamic stats badge -->
				<div class="shrink-0 self-start font-mono text-[10px] text-muted-foreground sm:self-center">
					{#if providerSearch || modelSearch || activationFilter !== 'all'}
						Found <span class="font-bold text-foreground">{filteredModels.length}</span> matching models
					{:else}
						Catalog: <span class="font-bold text-foreground">{flatModels.length}</span> models
					{/if}
				</div>
			</div>
		</div>

		{#if error}
			<div
				class="flex flex-col items-center justify-center space-y-4 rounded border border-destructive/20 bg-destructive/5 p-6 py-16 text-center"
			>
				<AlertTriangle class="size-6 stroke-[1.5] text-destructive" />
				<div class="space-y-1">
					<h4 class="font-mono text-xs font-bold tracking-tight text-destructive uppercase">
						Catalog loading failed
					</h4>
					<p class="max-w-sm font-mono text-xs leading-relaxed text-muted-foreground/85">{error}</p>
				</div>
				<Button
					class="h-9 gap-2 rounded border border-border bg-card px-4 font-mono text-xs font-bold tracking-wider text-foreground uppercase shadow-none hover:bg-muted"
					type="button"
					onclick={retry}
				>
					<RefreshCw class="size-3.5" />
					Retry load
				</Button>
			</div>
		{:else}
			{#if staleAllowed.length > 0 || unavailableAllowed.length > 0}
				<div class="rounded border border-destructive/20 bg-destructive/5 p-3">
					<div class="flex items-start gap-2.5">
						<AlertTriangle class="mt-0.5 size-4 shrink-0 text-destructive" />
						<div class="min-w-0 space-y-1">
							<h4 class="font-mono text-xs font-bold tracking-tight text-destructive uppercase">
								Unavailable demo selections
							</h4>
							<p class="font-mono text-[10px] leading-relaxed text-destructive/85">
								{staleAllowed.length + unavailableAllowed.length} saved selection{staleAllowed.length +
									unavailableAllowed.length ===
								1
									? ''
									: 's'} no longer resolve to runnable catalog models and will be removed with the next
								selection change.
							</p>
							<div class="flex flex-wrap gap-1.5 pt-1">
								{#each staleAllowed as model (model)}
									<span
										class="rounded border border-destructive/20 bg-background px-1.5 py-0.5 font-mono text-[9px] text-destructive"
									>
										{model}
									</span>
								{/each}
								{#each unavailableAllowed as model (model.value)}
									<span
										class="rounded border border-destructive/20 bg-background px-1.5 py-0.5 font-mono text-[9px] text-destructive"
									>
										{model.providerId}/{model.modelId}
									</span>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if filteredModels.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded border border-dashed border-border bg-muted/10 py-16 text-center"
				>
					<Cpu class="mb-2 size-7 stroke-[1.5] text-muted-foreground" />
					<p class="font-mono text-xs text-muted-foreground">
						No matching models or providers found.
					</p>
					<Button
						variant="ghost"
						class="mt-2 h-7 rounded font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
						onclick={() => {
							handleProviderInput('');
							handleModelInput('');
							activationFilter = 'all';
						}}
					>
						Clear filters
					</Button>
				</div>
			{/if}

			<div
				bind:this={scrollViewport}
				onscroll={handleScroll}
				use:infiniteScroll={loadMore}
				class={cn('max-h-[35rem] w-full overflow-y-auto', filteredModels.length === 0 && 'hidden')}
			>
				<div class="pr-2">
					<Table.Root>
						<Table.Header class="hover:bg-transparent">
							<Table.Row class="border-border hover:bg-transparent">
								<Table.Head
									class="w-[35%] py-3 font-mono text-xs font-bold tracking-tight text-foreground uppercase"
									>PROVIDER</Table.Head
								>
								<Table.Head
									class="w-[65%] py-3 font-mono text-xs font-bold tracking-tight text-foreground uppercase"
									>MODEL</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each visibleModels as row (row.value)}
								<Table.Row class="border-border hover:bg-transparent">
									<!-- Provider Column -->
									<Table.Cell class="py-3">
										<div class="flex items-center gap-3">
											<div
												class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-background"
											>
												<img
													class="size-4 object-contain grayscale filter dark:invert"
													src={row.providerLogoUrl}
													alt=""
												/>
											</div>
											<div class="flex min-w-0 flex-col">
												<strong
													class="truncate font-mono text-xs font-bold tracking-tight text-foreground uppercase"
													>{row.providerName}</strong
												>
												<span
													class="mt-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
												>
													{#if row.providerEnabled}
														<span class="text-emerald-500">ACTIVE</span>
													{:else}
														<span class="text-muted-foreground/75">CATALOG ONLY</span>
													{/if}
												</span>
											</div>
										</div>
									</Table.Cell>

									<!-- Model Column -->
									<Table.Cell class="py-3">
										<label
											for={row.id}
											class={cn(
												'flex min-w-0 cursor-pointer items-center gap-3 rounded border px-3 py-2 transition-colors duration-150',
												allowedSet.has(row.value)
													? 'border-foreground/20 bg-foreground/10'
													: 'border-border/40 bg-muted/40 hover:bg-muted/60'
											)}
										>
											<Checkbox
												id={row.id}
												checked={allowedSet.has(row.value)}
												disabled={!row.modelEnabled}
												onCheckedChange={() => toggleAllowed(row.value)}
												class="rounded border-border/60 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background"
											/>
											<div
												class="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-1.5 font-mono text-[11px] font-bold text-foreground/85 select-none"
											>
												<div class="flex min-w-0 items-center gap-1.5">
													<Cpu
														class={cn(
															'size-3.5 shrink-0 transition-colors',
															allowedSet.has(row.value)
																? 'text-foreground'
																: 'text-muted-foreground'
														)}
													/>
													<span class="truncate">{row.modelName}</span>
												</div>
												<span
													class="ml-2 hidden shrink-0 font-mono text-[9px] text-muted-foreground/60 sm:inline"
													>{row.modelId}</span
												>
											</div>
										</label>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{/if}
	{/if}
</div>
