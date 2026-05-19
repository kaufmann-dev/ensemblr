<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let providerId = $state('');
	$effect(() => {
		if (!providerId) providerId = data.catalog.find((provider) => provider.enabled)?.id ?? '';
	});
</script>

<svelte:head><title>API Keys | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-4xl space-y-4 px-4 py-6">
	<Card>
		<CardHeader><CardTitle>Provider API keys</CardTitle></CardHeader>
		<CardContent class="space-y-4">
			{#if data.role === 'demo'}
				<p class="text-sm text-muted-foreground">
					Demo accounts use admin-managed credentials and cannot save API keys.
				</p>
			{:else}
				<form class="grid gap-3 md:grid-cols-[1fr_1fr_auto]" method="POST" action="?/save">
					<div class="space-y-2">
						<Label for="provider">Provider</Label>
						<select
							id="provider"
							name="providerId"
							class="h-10 w-full rounded-md border bg-background px-3 text-sm"
							bind:value={providerId}
						>
							{#each data.catalog as provider (provider.id)}
								<option value={provider.id} disabled={!provider.enabled}>{provider.name}</option>
							{/each}
						</select>
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
				{#each data.catalog.filter( (provider) => data.keys.includes(provider.id) ) as provider (provider.id)}
					<div class="flex items-center justify-between rounded-md border p-3">
						<div class="flex items-center gap-3">
							<img class="size-5" src={provider.logoUrl} alt="" />
							<span class="font-medium">{provider.name}</span>
							<Badge variant="secondary">saved</Badge>
						</div>
						{#if data.role !== 'demo'}
							<form method="POST" action="?/delete">
								<input type="hidden" name="providerId" value={provider.id} />
								<Button type="submit" variant="outline" size="sm">Delete</Button>
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
