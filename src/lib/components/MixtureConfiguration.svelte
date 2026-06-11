<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import {
		MIXTURE_CONFIG_COLLAPSED_KEY,
		isMixtureConfigurationCollapsed,
		readMixtureCollapsedPreference
	} from '$lib/workspace';
	import { ChevronDown, ChevronUp, Cpu, Key, Layers, ShieldCheck } from '@lucide/svelte';
	import { onMount } from 'svelte';

	type CatalogProvider = {
		id: string;
		name: string;
		models: { id: string; name?: string | null; enabled: boolean }[];
	};
	type WorkerSelection = { id: string; value: string };

	let {
		catalog,
		userRole,
		keyProviders,
		workers = $bindable(),
		judgeId = $bindable(),
		rounds = $bindable(),
		running
	}: {
		catalog: CatalogProvider[];
		userRole: string;
		keyProviders: string[];
		workers: WorkerSelection[];
		judgeId: string;
		rounds: number;
		running: boolean;
	} = $props();

	let collapsedPreference = $state(false);

	let modelOptions = $derived(
		catalog.flatMap((provider) =>
			provider.models.map((model) => ({
				id: `${provider.id}/${model.id}`,
				name: model.name ?? model.id,
				provider: provider.name
			}))
		)
	);
	let selectedWorkers = $derived(workers.filter((worker) => worker.value));
	let hasModelOptions = $derived(modelOptions.length > 0);
	let valid = $derived(hasModelOptions && selectedWorkers.length >= 2 && Boolean(judgeId));
	let collapsed = $derived(isMixtureConfigurationCollapsed(valid, collapsedPreference));
	let emptyModelsMessage = $derived(
		userRole === 'demo'
			? 'No demo models are currently enabled.'
			: keyProviders.length === 0
				? 'Add an API key before selecting models.'
				: 'None of your saved providers currently have enabled models.'
	);

	onMount(() => {
		collapsedPreference = readMixtureCollapsedPreference(
			sessionStorage.getItem(MIXTURE_CONFIG_COLLAPSED_KEY)
		);
	});

	function modelTriggerLabel(value: string, fallback: string) {
		const option = modelOptions.find((model) => model.id === value);
		return option ? `${option.provider}: ${option.name}` : fallback;
	}

	function toggleCollapsed() {
		if (!valid) return;
		collapsedPreference = !collapsed;
		sessionStorage.setItem(MIXTURE_CONFIG_COLLAPSED_KEY, String(collapsedPreference));
	}
</script>

<section class="rounded border border-border bg-card" aria-labelledby="mixture-config-heading">
	<button
		type="button"
		class="flex w-full items-start justify-between gap-4 rounded px-4 py-3 text-left hover:bg-muted/30 disabled:cursor-default disabled:hover:bg-transparent"
		onclick={toggleCollapsed}
		disabled={!valid}
		aria-expanded={!collapsed}
		aria-controls="mixture-config-content"
	>
		<div class="min-w-0">
			<h2 id="mixture-config-heading" class="text-sm font-semibold text-foreground">
				Configure mixture
			</h2>
			{#if collapsed}
				<p class="mt-1 truncate text-xs text-muted-foreground">
					{selectedWorkers.length} workers · {modelTriggerLabel(judgeId, 'No judge')} · {rounds}
					{rounds === 1 ? 'round' : 'rounds'}
				</p>
			{:else}
				<p class="mt-1 text-xs text-muted-foreground">
					Choose at least two workers, a synthesizing judge, and the number of rounds.
				</p>
			{/if}
		</div>
		{#if valid}
			{#if collapsed}
				<ChevronDown class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			{:else}
				<ChevronUp class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			{/if}
		{/if}
	</button>

	{#if !collapsed}
		<div id="mixture-config-content" class="border-t border-border px-4 py-4">
			{#if hasModelOptions}
				<div class="grid gap-4 md:grid-cols-2">
					{#each workers as worker, index (worker.id)}
						<div class="space-y-1.5">
							<div class="flex items-center gap-1.5">
								<Cpu class="size-3.5 text-muted-foreground" />
								<Label for={worker.id}
									>Worker model {index + 1}{index > 1 ? ' (optional)' : ''}</Label
								>
							</div>
							<Select.Root type="single" bind:value={worker.value} disabled={running}>
								<Select.Trigger id={worker.id} class="text-xs">
									<span class="truncate">
										{modelTriggerLabel(worker.value, `Select worker ${index + 1}`)}
									</span>
								</Select.Trigger>
								<Select.Content class="p-1">
									{#each catalog as provider (provider.id)}
										<Select.Group>
											<Select.Label
												class="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
											>
												{provider.name}
											</Select.Label>
											{#each provider.models as model (model.id)}
												<Select.Item
													value={`${provider.id}/${model.id}`}
													label={`${provider.name}: ${model.name ?? model.id}`}
													class="mx-0.5 cursor-pointer rounded-sm px-2 py-1.5 text-xs"
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
							<Label for="judge-model">Synthesizing judge model</Label>
						</div>
						<Select.Root type="single" bind:value={judgeId} disabled={running}>
							<Select.Trigger id="judge-model" class="text-xs">
								<span class="truncate">{modelTriggerLabel(judgeId, 'Select judge model')}</span>
							</Select.Trigger>
							<Select.Content class="p-1">
								{#each catalog as provider (provider.id)}
									<Select.Group>
										<Select.Label class="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
											{provider.name}
										</Select.Label>
										{#each provider.models as model (model.id)}
											<Select.Item
												value={`${provider.id}/${model.id}`}
												label={`${provider.name}: ${model.name ?? model.id}`}
												class="mx-0.5 cursor-pointer rounded-sm px-2 py-1.5 text-xs"
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
							<Label for="rounds">Rounds of mixture</Label>
						</div>
						<div class="relative flex items-center">
							<Input
								id="rounds"
								class="pr-14 text-xs"
								type="number"
								min="1"
								max="3"
								bind:value={rounds}
								disabled={running}
							/>
							<span class="absolute right-3 text-xs text-muted-foreground">Max 3</span>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex min-w-0 items-start gap-3">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded border border-border bg-muted text-muted-foreground"
						>
							<Key class="size-3.5" />
						</div>
						<div class="min-w-0">
							<h3 class="text-sm font-semibold text-foreground">No models available</h3>
							<p class="mt-0.5 text-xs break-words text-muted-foreground">{emptyModelsMessage}</p>
						</div>
					</div>
					{#if userRole !== 'demo'}
						<Button
							href={resolve('/settings')}
							variant="outline"
							size="sm"
							class="h-8 shrink-0 rounded text-xs"
						>
							Configure keys
						</Button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</section>
