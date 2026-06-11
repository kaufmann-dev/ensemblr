<script lang="ts">
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { ChevronDown, Cpu, Key, Layers, ShieldCheck, SlidersHorizontal } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	const COLLAPSED_STORAGE_KEY = 'ensemblr:mixture-config-collapsed';

	type CatalogProvider = {
		id: string;
		name: string;
		models: { id: string; name?: string | null }[];
	};
	type WorkerSelection = { id: string; value: string };

	let {
		catalog,
		workers = $bindable(),
		judgeId = $bindable(),
		rounds = $bindable(),
		disabled = false,
		userRole,
		emptyModelsMessage
	}: {
		catalog: CatalogProvider[];
		workers: WorkerSelection[];
		judgeId: string;
		rounds: number;
		disabled?: boolean;
		userRole: string;
		emptyModelsMessage: string;
	} = $props();

	let modelOptions = $derived(
		catalog.flatMap((provider) =>
			provider.models.map((model) => ({
				id: `${provider.id}/${model.id}`,
				name: model.name ?? model.id,
				provider: provider.name
			}))
		)
	);
	let hasModelOptions = $derived(modelOptions.length > 0);
	let selectedWorkers = $derived(workers.filter((worker) => worker.value));
	let isValid = $derived(hasModelOptions && selectedWorkers.length >= 2 && Boolean(judgeId));

	let collapsedPreference = $state(
		browser ? sessionStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true' : false
	);
	// The panel is forced open while the configuration is invalid.
	let collapsed = $derived(isValid && collapsedPreference);

	function toggle() {
		if (!collapsed && !isValid) return;
		collapsedPreference = !collapsed;
		sessionStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsedPreference));
	}

	function modelLabel(value: string, fallback: string) {
		const option = modelOptions.find((model) => model.id === value);
		return option ? `${option.provider}: ${option.name}` : fallback;
	}

	function workerSummary() {
		return `${selectedWorkers.length} worker${selectedWorkers.length === 1 ? '' : 's'}`;
	}
</script>

<section class="rounded-lg border border-border bg-card" aria-label="Configure mixture">
	<button
		type="button"
		class={cn(
			'flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-medium',
			isValid ? 'hover:bg-muted/50' : 'cursor-default'
		)}
		onclick={toggle}
		aria-expanded={!collapsed}
		aria-controls="mixture-config-content"
		disabled={!isValid && !collapsed}
	>
		<SlidersHorizontal class="size-4 shrink-0 text-muted-foreground" />
		<span class="shrink-0">Configure mixture</span>
		{#if collapsed}
			<span class="min-w-0 flex-1 truncate text-xs text-muted-foreground">
				{workerSummary()} · Judge {modelLabel(judgeId, 'not selected')} · {rounds} round{rounds ===
				1
					? ''
					: 's'}
			</span>
		{:else}
			<span class="flex-1"></span>
		{/if}
		{#if isValid}
			<ChevronDown
				class={cn(
					'size-4 shrink-0 text-muted-foreground transition-transform',
					!collapsed && 'rotate-180'
				)}
			/>
		{/if}
	</button>

	{#if !collapsed}
		<div id="mixture-config-content" class="border-t border-border p-4">
			{#if hasModelOptions}
				<div class="grid gap-4 md:grid-cols-2">
					{#each workers as worker, index (worker.id)}
						<div class="space-y-1.5">
							<div class="flex items-center gap-1.5">
								<Cpu class="size-3.5 text-muted-foreground" />
								<Label for={worker.id}>
									Worker model {index + 1}{index > 1 ? ' (optional)' : ''}
								</Label>
							</div>
							<Select.Root type="single" bind:value={worker.value} {disabled}>
								<Select.Trigger id={worker.id} class="w-full text-sm">
									<span class="truncate">
										{modelLabel(worker.value, `Select worker ${index + 1}`)}
									</span>
								</Select.Trigger>
								<Select.Content>
									{#each catalog as provider (provider.id)}
										<Select.Group>
											<Select.Label>{provider.name}</Select.Label>
											{#each provider.models as model (model.id)}
												<Select.Item
													value={`${provider.id}/${model.id}`}
													label={`${provider.name}: ${model.name ?? model.id}`}
												>
													<span class="truncate">{model.name ?? model.id}</span>
												</Select.Item>
											{/each}
										</Select.Group>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					{/each}

					<div class="space-y-1.5">
						<div class="flex items-center gap-1.5">
							<ShieldCheck class="size-3.5 text-muted-foreground" />
							<Label for="judge-model">Judge model</Label>
						</div>
						<Select.Root type="single" bind:value={judgeId} {disabled}>
							<Select.Trigger id="judge-model" class="w-full text-sm">
								<span class="truncate">{modelLabel(judgeId, 'Select judge model')}</span>
							</Select.Trigger>
							<Select.Content>
								{#each catalog as provider (provider.id)}
									<Select.Group>
										<Select.Label>{provider.name}</Select.Label>
										{#each provider.models as model (model.id)}
											<Select.Item
												value={`${provider.id}/${model.id}`}
												label={`${provider.name}: ${model.name ?? model.id}`}
											>
												<span class="truncate">{model.name ?? model.id}</span>
											</Select.Item>
										{/each}
									</Select.Group>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-1.5">
						<div class="flex items-center gap-1.5">
							<Layers class="size-3.5 text-muted-foreground" />
							<Label for="rounds">Rounds (1–3)</Label>
						</div>
						<Input id="rounds" type="number" min="1" max="3" bind:value={rounds} {disabled} />
					</div>
				</div>
			{:else}
				<div
					class="flex flex-col gap-4 rounded-md border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div class="flex min-w-0 items-start gap-3">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
						>
							<Key class="size-3.5" />
						</div>
						<div class="min-w-0">
							<h4 class="text-sm font-medium text-foreground">No models available</h4>
							<p class="mt-0.5 text-xs break-words text-muted-foreground">{emptyModelsMessage}</p>
						</div>
					</div>
					{#if userRole !== 'demo'}
						<Button href={resolve('/settings')} variant="outline" size="sm" class="shrink-0">
							Configure keys
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</section>
