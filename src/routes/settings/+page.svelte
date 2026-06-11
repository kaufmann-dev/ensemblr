<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/PageHeader.svelte';
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

<svelte:head><title>API keys | ensemblr</title></svelte:head>

<main class="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
	<PageHeader
		title="Provider API keys"
		description="Configure access to model providers. Keys are encrypted at rest."
		icon={Key}
	/>

	{#if data.role === 'demo'}
		<div class="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
			<ShieldAlert class="mt-0.5 size-4 shrink-0 text-foreground" />
			<div>
				<h2 class="text-sm font-medium text-foreground">Demo session restrictions</h2>
				<p class="mt-0.5 text-sm leading-relaxed text-muted-foreground">
					Demo sessions run generations with shared, admin-managed credentials, so you do not need
					to add your own API keys.
				</p>
			</div>
		</div>
	{:else}
		<form
			class="grid items-end gap-4 border-b border-border pb-5 md:grid-cols-[1.2fr_1.8fr_auto]"
			method="POST"
			action="?/save"
		>
			<input type="hidden" name="providerId" value={providerId} />

			<div class="space-y-1.5">
				<Label for="provider">Provider</Label>
				<Select.Root type="single" bind:value={providerId}>
					<Select.Trigger id="provider" class="w-full">
						<span class="truncate">{selectedProviderName}</span>
					</Select.Trigger>
					<Select.Content>
						{#each data.catalog as provider (provider.id)}
							<Select.Item value={provider.id} label={provider.name} disabled={!provider.enabled}>
								<span class="truncate">{provider.name}</span>
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-1.5">
				<Label for="api-key">API key</Label>
				<div class="relative flex items-center">
					<Input
						id="api-key"
						name="apiKey"
						type={showApiKey ? 'text' : 'password'}
						autocomplete="new-password"
						placeholder="Paste your API key"
						class="pr-8 font-mono"
						required
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						class="absolute right-1 text-muted-foreground hover:text-foreground"
						onclick={() => (showApiKey = !showApiKey)}
						aria-label={showApiKey ? 'Hide key' : 'Show key'}
					>
						{#if showApiKey}
							<EyeOff class="size-3.5" />
						{:else}
							<Eye class="size-3.5" />
						{/if}
					</Button>
				</div>
			</div>

			<Button type="submit">Save key</Button>
		</form>

		{#if form?.message}
			<div
				class="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
				role="alert"
			>
				{form.message}
			</div>
		{/if}

		<section class="space-y-3">
			<h2 class="text-sm font-medium text-foreground">
				Configured providers ({savedProviders.length})
			</h2>
			<div class="grid gap-2">
				{#each savedProviders as provider (provider.id)}
					<div
						class="flex flex-col gap-4 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
					>
						<div class="flex min-w-0 items-center gap-3.5">
							<div
								class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card"
							>
								<img
									class="size-5 object-contain grayscale filter dark:invert"
									src={provider.logoUrl}
									alt=""
								/>
							</div>
							<div class="min-w-0">
								<span class="truncate text-sm font-medium text-foreground">{provider.name}</span>
								<div class="mt-0.5 flex items-center gap-1.5">
									<CheckCircle class="size-3 text-foreground" />
									<span class="text-xs text-muted-foreground">Key saved</span>
								</div>
							</div>
						</div>

						<form method="POST" action="?/delete" class="shrink-0">
							<input type="hidden" name="providerId" value={provider.id} />
							<Button class="w-full sm:w-auto" type="submit" variant="outline" size="sm">
								<Trash2 class="size-3.5" />
								Delete
							</Button>
						</form>
					</div>
				{:else}
					<div
						class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/10 py-12 text-center"
					>
						<Key class="size-6 text-muted-foreground" />
						<p class="text-sm text-muted-foreground">
							No keys saved yet. Add a key above to enable models.
						</p>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</main>
