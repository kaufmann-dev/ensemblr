<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

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

	function toggleAllowed(value: string) {
		allowed = allowed.includes(value)
			? allowed.filter((item) => item !== value)
			: [...allowed, value];
	}
</script>

<Card>
	<CardHeader><CardTitle>Demo allowed models</CardTitle></CardHeader>
	<CardContent>
		{#if loading}
			<p class="text-sm text-muted-foreground">Loading models...</p>
		{:else if error}
			<div class="grid gap-3">
				<p class="text-sm break-words text-destructive">{error}</p>
				<Button class="w-fit" type="button" variant="outline" onclick={retry}>Retry</Button>
			</div>
		{:else}
			<ScrollArea class="max-h-[32rem]">
				<div class="grid gap-2 pr-1">
					{#each catalog as provider (provider.id)}
						<div class="rounded-md border p-3">
							<div class="mb-3 flex min-w-0 flex-wrap items-center gap-2">
								<img class="size-5" src={provider.logoUrl} alt="" />
								<strong class="break-words">{provider.name}</strong>
								{#if provider.enabled}
									<Badge variant="secondary">enabled</Badge>
								{:else}
									<Badge variant="outline">catalog only</Badge>
								{/if}
							</div>
							<div class="grid gap-2 md:grid-cols-2">
								{#each provider.models as model (model.id)}
									{@const value = `${provider.id}/${model.id}`}
									{@const id = `demo-${provider.id}-${model.id}`}
									<div class="flex min-w-0 items-start gap-3 rounded-md p-2 hover:bg-muted">
										<Checkbox
											{id}
											checked={allowed.includes(value)}
											disabled={!model.enabled}
											onclick={() => toggleAllowed(value)}
										/>
										<Label class="min-w-0 flex-1 text-sm font-normal" for={id}>
											<span class="break-words">{model.name ?? model.id}</span>
										</Label>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</ScrollArea>
		{/if}
	</CardContent>
</Card>
