<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let providerId = $derived(data.catalog.find((provider) => provider.enabled)?.id ?? '');
	let savedProviders = $derived(data.catalog.filter((provider) => data.keys.includes(provider.id)));
	let selectedProviderName = $derived(
		data.catalog.find((provider) => provider.id === providerId)?.name ?? 'Select provider'
	);
</script>

<svelte:head><title>API Keys | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 px-3 py-4 sm:px-4 sm:py-6">
	<Card>
		<CardHeader><CardTitle>Provider API keys</CardTitle></CardHeader>
		<CardContent class="space-y-4">
			{#if data.role === 'demo'}
				<p class="text-sm text-muted-foreground">
					Demo accounts use admin-managed credentials and cannot save API keys.
				</p>
			{:else}
				<form class="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="POST" action="?/save">
					<input type="hidden" name="providerId" value={providerId} />
					<div class="space-y-2">
						<Label for="provider">Provider</Label>
						<Select.Root type="single" bind:value={providerId}>
							<Select.Trigger id="provider" class="w-full">
								<span class="truncate">{selectedProviderName}</span>
							</Select.Trigger>
							<Select.Content class="max-h-80">
								{#each data.catalog as provider (provider.id)}
									<Select.Item
										value={provider.id}
										label={provider.name}
										disabled={!provider.enabled}
									>
										<span class="truncate">{provider.name}</span>
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="space-y-2">
						<Label for="api-key">API key</Label>
						<Input id="api-key" name="apiKey" type="password" autocomplete="off" />
					</div>
					<Button class="self-end" type="submit">Save</Button>
				</form>
				{#if form?.message}
					<p class="text-sm text-destructive">{form.message}</p>
				{/if}
			{/if}

			<div class="grid gap-2">
				{#each savedProviders as provider (provider.id)}
					<div
						class="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
					>
						<div class="flex min-w-0 items-center gap-3">
							<img class="size-5" src={provider.logoUrl} alt="" />
							<span class="truncate font-medium">{provider.name}</span>
							<Badge variant="secondary">saved</Badge>
						</div>
						{#if data.role !== 'demo'}
							<form method="POST" action="?/delete">
								<input type="hidden" name="providerId" value={provider.id} />
								<Button class="w-full sm:w-auto" type="submit" variant="outline" size="sm"
									>Delete</Button
								>
							</form>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">No keys saved.</p>
				{/each}
			</div>
		</CardContent>
	</Card>
</main>
