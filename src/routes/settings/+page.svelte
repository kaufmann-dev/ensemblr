<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { Key, Eye, EyeOff, ShieldAlert, CheckCircle, Trash2 } from '@lucide/svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let providerId = $derived(data.catalog.find((provider) => provider.enabled)?.id ?? '');
	let savedProviders = $derived(data.catalog.filter((provider) => data.keys.includes(provider.id)));
	let selectedProviderName = $derived(
		data.catalog.find((provider) => provider.id === providerId)?.name ?? 'Select provider'
	);

	let showApiKey = $state(false);
</script>

<svelte:head><title>API Keys | ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-4xl mx-auto w-full px-4 py-8 space-y-5 bg-background">
	<Card class="border border-border bg-card rounded shadow-xs">
		<CardHeader class="pb-3 pt-4 px-5 border-b border-border">
			<div class="flex items-center gap-3">
				<div class="flex size-7 items-center justify-center rounded border border-border bg-muted text-foreground/80">
					<Key class="size-3.5" />
				</div>
				<div>
					<CardTitle class="text-sm font-bold font-mono tracking-tight">Provider API keys</CardTitle>
					<CardDescription class="text-[10px] font-mono text-muted-foreground mt-0.5">Securely configure access to LLM model endpoints</CardDescription>
				</div>
			</div>
		</CardHeader>
		
		<CardContent class="space-y-5 p-5">
			{#if data.role === 'demo'}
				<div class="flex items-start gap-3 rounded border border-border bg-muted/40 p-4">
					<ShieldAlert class="size-4.5 text-foreground shrink-0 mt-0.5" />
					<div class="space-y-1">
						<h4 class="text-xs font-mono font-bold text-foreground">Demo Environment Restrictions</h4>
						<p class="text-[10px] font-mono text-muted-foreground mt-0.5 leading-relaxed">
							Demo accounts run Mixture-of-Agents generations using shared, admin-managed credentials. You do not need to add your own API keys to explore the sandbox!
						</p>
					</div>
				</div>
			{:else}
				<form class="grid gap-4 md:grid-cols-[1.2fr_1.8fr_auto] items-end border-b border-border pb-5" method="POST" action="?/save">
					<input type="hidden" name="providerId" value={providerId} />
					
					<!-- Provider Selector -->
					<div class="space-y-1.5">
						<Label for="provider" class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">LLM Provider</Label>
						<Select.Root type="single" bind:value={providerId}>
							<Select.Trigger id="provider" class="w-full h-8.5 text-xs font-mono rounded border-border focus-visible:ring-1 focus-visible:ring-foreground/20">
								<span class="truncate">{selectedProviderName}</span>
							</Select.Trigger>
							<Select.Content class="max-h-80 border border-border bg-popover rounded p-1 shadow-md">
								{#each data.catalog as provider (provider.id)}
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
						<Label for="api-key" class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">API Credential Key</Label>
						<div class="relative flex items-center">
							<Input 
								id="api-key" 
								name="apiKey" 
								type={showApiKey ? 'text' : 'password'} 
								autocomplete="new-password" 
								placeholder="Paste your API key here..."
								class="h-8.5 text-xs rounded border-border pr-8 focus-visible:ring-1 focus-visible:ring-foreground/20 font-mono"
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
				
				{#if form?.message}
					<div class="rounded border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-mono text-destructive">
						{form.message}
					</div>
				{/if}
			{/if}

			<!-- Saved Credentials Section -->
			<div class="space-y-3">
				<h3 class="text-xs font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Configured Providers ({savedProviders.length})</h3>
				<div class="grid gap-2">
					{#each savedProviders as provider (provider.id)}
						<div class="flex flex-col gap-4 rounded border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between hover:border-foreground/30 transition-all duration-150">
							<div class="flex min-w-0 items-center gap-3.5">
								<div class="flex size-8 items-center justify-center rounded bg-card border border-border overflow-hidden shadow-xs shrink-0">
									<img class="size-5 object-contain" src={provider.logoUrl} alt="" />
								</div>
								<div class="min-w-0">
									<span class="truncate font-mono text-xs font-bold text-foreground">{provider.name}</span>
									<div class="flex items-center gap-1.5 mt-0.5">
										<CheckCircle class="size-3 text-foreground" />
										<span class="text-[9px] text-muted-foreground font-mono uppercase tracking-widest">Credential Active</span>
									</div>
								</div>
							</div>
							
							{#if data.role !== 'demo'}
								<form method="POST" action="?/delete" class="shrink-0">
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
							{/if}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded bg-muted/10">
							<Key class="size-7 text-muted-foreground/30 mb-2 stroke-[1.5]" />
							<p class="text-[11px] font-mono text-muted-foreground">No credentials saved yet. Add a key above to activate models.</p>
						</div>
					{/each}
				</div>
			</div>
		</CardContent>
	</Card>
</main>
