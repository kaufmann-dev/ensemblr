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

<svelte:head><title>API Keys | Ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-4xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<!-- Glowing accent background orb -->
	<div class="absolute top-[10%] left-[20%] -z-10 size-[20rem] rounded-full bg-primary/5 blur-[80px]"></div>

	<Card class="glass-panel border-border/30 premium-glow-purple">
		<CardHeader class="border-b border-border/20 pb-4">
			<div class="flex items-center gap-3">
				<div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
					<Key class="size-4.5" />
				</div>
				<div>
					<CardTitle class="text-lg font-bold">Provider API keys</CardTitle>
					<CardDescription class="text-xs">Securely configure access to LLM model endpoints</CardDescription>
				</div>
			</div>
		</CardHeader>
		
		<CardContent class="space-y-6 pt-5">
			{#if data.role === 'demo'}
				<div class="flex items-start gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
					<ShieldAlert class="size-4.5 text-cyan-400 shrink-0 mt-0.5" />
					<div class="space-y-1">
						<h4 class="text-sm font-bold text-cyan-200">Demo Environment Restrictions</h4>
						<p class="text-xs text-muted-foreground/85 leading-relaxed">
							Demo accounts run Mixture-of-Agents generations using shared, admin-managed credentials. You do not need to add your own API keys to explore the sandbox!
						</p>
					</div>
				</div>
			{:else}
				<form class="grid gap-4 md:grid-cols-[1.2fr_1.8fr_auto] items-end border-b border-border/20 pb-6" method="POST" action="?/save">
					<input type="hidden" name="providerId" value={providerId} />
					
					<!-- Provider Selector -->
					<div class="space-y-2">
						<Label for="provider" class="text-xs font-bold uppercase tracking-wider text-foreground/80">LLM Provider</Label>
						<Select.Root type="single" bind:value={providerId}>
							<Select.Trigger id="provider" class="w-full h-10">
								<span class="truncate">{selectedProviderName}</span>
							</Select.Trigger>
							<Select.Content class="max-h-80 border-border/30 bg-popover/95 backdrop-blur-2xl">
								{#each data.catalog as provider (provider.id)}
									<Select.Item
										value={provider.id}
										label={provider.name}
										disabled={!provider.enabled}
										class="rounded-xl mx-1"
									>
										<span class="truncate font-medium">{provider.name}</span>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					
					<!-- API Key Input -->
					<div class="space-y-2">
						<Label for="api-key" class="text-xs font-bold uppercase tracking-wider text-foreground/80">API Credential Key</Label>
						<div class="relative flex items-center">
							<Input 
								id="api-key" 
								name="apiKey" 
								type={showApiKey ? 'text' : 'password'} 
								autocomplete="new-password" 
								placeholder="Paste your API key here..."
								class="h-10 text-sm pr-10 border-border/40 focus-visible:ring-primary/20"
								required
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="absolute right-1 size-8 rounded-lg text-muted-foreground/60 hover:text-foreground active:scale-95 transition-all"
								onclick={() => showApiKey = !showApiKey}
								aria-label="Toggle show key"
							>
								{#if showApiKey}
									<EyeOff class="size-4" />
								{:else}
									<Eye class="size-4" />
								{/if}
							</Button>
						</div>
					</div>
					
					<!-- Action Button -->
					<Button class="h-10 px-5 font-bold shadow-md shadow-primary/10 hover:shadow-primary/20 rounded-xl" type="submit">
						Save credential
					</Button>
				</form>
				
				{#if form?.message}
					<div class="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs font-medium text-destructive animate-headshake">
						{form.message}
					</div>
				{/if}
			{/if}

			<!-- Saved Credentials Section -->
			<div class="space-y-3">
				<h3 class="text-xs font-bold uppercase tracking-wider text-foreground/80">Configured Providers ({savedProviders.length})</h3>
				<div class="grid gap-3">
					{#each savedProviders as provider (provider.id)}
						<div class="flex flex-col gap-4 rounded-xl border border-border/25 bg-muted/5 p-4 sm:flex-row sm:items-center sm:justify-between hover:border-primary/20 transition-all duration-300">
							<div class="flex min-w-0 items-center gap-3.5">
								<div class="flex size-10 items-center justify-center rounded-xl bg-card border border-border/30 overflow-hidden shadow-sm shrink-0">
									<img class="size-6 object-contain" src={provider.logoUrl} alt="" />
								</div>
								<div class="min-w-0">
									<span class="truncate font-semibold text-foreground/95">{provider.name}</span>
									<div class="flex items-center gap-1.5 mt-0.5">
										<CheckCircle class="size-3 text-emerald-400" />
										<span class="text-[10px] text-muted-foreground/85 uppercase font-bold tracking-wider">Credential Active</span>
									</div>
								</div>
							</div>
							
							{#if data.role !== 'demo'}
								<form method="POST" action="?/delete" class="shrink-0">
									<input type="hidden" name="providerId" value={provider.id} />
									<Button 
										class="w-full sm:w-auto rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/15 active:scale-95 transition-all" 
										type="submit" 
										variant="outline" 
										size="sm"
									>
										<Trash2 class="size-3.5 mr-1.5" />
										Delete
									</Button>
								</form>
							{/if}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border/40 rounded-xl bg-muted/5">
							<Key class="size-8 text-muted-foreground/30 mb-2 stroke-[1.5]" />
							<p class="text-xs text-muted-foreground/85">No credentials saved yet. Add a key above to activate models.</p>
						</div>
					{/each}
				</div>
			</div>
		</CardContent>
	</Card>
</main>
