<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Key, Eye, EyeOff, CheckCircle, Trash2 } from '@lucide/svelte';
	import type { ActionData } from './$types';

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

	let { catalog, demoKeys, form }: { catalog: CatalogProvider[]; demoKeys: string[]; form: ActionData } = $props();

	let providerId = $derived(catalog.find((provider) => provider.enabled)?.id ?? '');
	let savedProviders = $derived(catalog.filter((provider) => demoKeys.includes(provider.id)));
	let selectedProviderName = $derived(
		catalog.find((provider) => provider.id === providerId)?.name ?? 'Select provider'
	);

	let showApiKey = $state(false);
</script>

<div class="space-y-6 pt-3">
	<div class="mb-4">
		<p class="text-[10px] font-mono text-muted-foreground leading-relaxed max-w-2xl">
			These API keys will be used exclusively by the demo account. The demo user will not be able to see or modify these keys.
		</p>
	</div>

	<form class="grid gap-4 md:grid-cols-[1.2fr_1.8fr_auto] items-end border-b border-border pb-5" method="POST" action="?/saveDemoKey">
		<input type="hidden" name="providerId" value={providerId} />
		
		<!-- Provider Selector -->
		<div class="space-y-1.5">
			<Label for="provider">LLM Provider</Label>
			<Select.Root type="single" bind:value={providerId}>
				<Select.Trigger id="provider" class="text-xs font-mono">
					<span class="truncate">{selectedProviderName}</span>
				</Select.Trigger>
				<Select.Content class="p-1">
					{#each catalog as provider (provider.id)}
						<Select.Item
							value={provider.id}
							label={provider.name}
							disabled={!provider.enabled}
							class="rounded-sm mx-0.5 text-xs font-mono px-2 py-1.5 cursor-pointer"
						>
							<span class="truncate font-medium">{provider.name}</span>
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
		
		<!-- API Key Input -->
		<div class="space-y-1.5">
			<Label for="api-key">API Credential Key</Label>
			<div class="relative flex items-center">
				<Input 
					id="api-key" 
					name="apiKey" 
					type={showApiKey ? 'text' : 'password'} 
					autocomplete="new-password" 
					placeholder="Paste your API key here..."
					class="text-xs pr-8 font-mono"
					required
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="absolute right-1 size-6.5 rounded text-muted-foreground/60 hover:text-foreground active:scale-95 transition-all"
					onclick={() => showApiKey = !showApiKey}
					aria-label="Toggle show key"
				>
					{#if showApiKey}
						<EyeOff class="size-3.5" />
					{:else}
						<Eye class="size-3.5" />
					{/if}
				</Button>
			</div>
		</div>
		
		<!-- Action Button -->
		<Button class="h-8.5 px-4 font-mono text-xs font-bold rounded shadow-none" type="submit">
			Save credential
		</Button>
	</form>
	
	{#if form?.message && (form?.action === 'saveDemoKey' || form?.action === 'deleteDemoKey')}
		<div class="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-mono text-destructive">
			{form.message}
		</div>
	{/if}

	<!-- Saved Credentials Section -->
	<div class="space-y-3">
		<h3 class="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Configured Providers ({savedProviders.length})</h3>
		<div class="grid gap-2">
			{#each savedProviders as provider (provider.id)}
				<div class="flex flex-col gap-4 rounded border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between hover:border-foreground/30">
					<div class="flex min-w-0 items-center gap-3.5">
						<div class="flex size-8 items-center justify-center rounded bg-card border border-border overflow-hidden shrink-0">
							<img class="size-5 object-contain filter grayscale dark:invert" src={provider.logoUrl} alt="" />
						</div>
						<div class="min-w-0">
							<span class="truncate font-mono text-xs font-bold text-foreground">{provider.name}</span>
							<div class="flex items-center gap-1.5 mt-0.5">
								<CheckCircle class="size-3 text-foreground" />
								<span class="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Credential Active</span>
							</div>
						</div>
					</div>
					
					<form method="POST" action="?/deleteDemoKey" class="shrink-0">
						<input type="hidden" name="providerId" value={provider.id} />
						<Button 
							class="w-full sm:w-auto h-7.5 rounded text-[10px] font-mono border-border hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all" 
							type="submit" 
							variant="outline" 
							size="sm"
						>
							<Trash2 class="size-3.5 mr-1" />
							Delete
						</Button>
					</form>
				</div>
			{:else}
				<div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded bg-muted/10">
					<Key class="size-7 text-muted-foreground/30 mb-2 stroke-[1.5]" />
					<p class="text-[11px] font-mono text-muted-foreground">No credentials saved yet. Add a key above to activate models for the demo account.</p>
				</div>
			{/each}
		</div>
	</div>
</div>
