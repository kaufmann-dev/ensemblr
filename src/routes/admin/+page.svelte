<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PageProps } from './$types';

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

	let { data, form }: PageProps = $props();
	let activeTab = $state('prompts');
	let allowed = $derived(
		data.settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
	);
	let catalog = $state.raw<CatalogProvider[]>([]);
	let catalogLoading = $state(false);
	let catalogError = $state('');
	let catalogLoaded = $state(false);
	let demoModelsComponent = $state<Promise<typeof import('./AdminDemoModels.svelte')>>();

	async function loadCatalog() {
		if (catalogLoading || catalogLoaded) return;

		catalogLoading = true;
		catalogError = '';

		try {
			const response = await fetch('/api/catalog');
			if (!response.ok) throw new Error('Could not load model catalog');
			const payload = (await response.json()) as { providers: CatalogProvider[] };
			catalog = payload.providers;
			catalogLoaded = true;
		} catch (error) {
			catalogError = error instanceof Error ? error.message : 'Could not load model catalog';
		} finally {
			catalogLoading = false;
		}
	}

	function setActiveTab(value: string) {
		activeTab = value;
		if (value !== 'demo') return;

		demoModelsComponent ??= import('./AdminDemoModels.svelte');
		void loadCatalog();
	}

	function retryCatalog() {
		catalogLoaded = false;
		void loadCatalog();
	}
</script>

<svelte:head><title>Admin | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
	<form method="POST">
		{#each allowed as model (model)}
			<input type="hidden" name="demoAllowedModels" value={model} />
		{/each}
		<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
			<Tabs.List class="max-w-full justify-start overflow-x-auto">
				<Tabs.Trigger value="prompts">Prompt templates</Tabs.Trigger>
				<Tabs.Trigger value="demo">Demo models</Tabs.Trigger>
				<Tabs.Trigger value="users" disabled>User management</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="prompts" class="mt-4">
				<Card>
					<CardHeader><CardTitle>Mixture prompts</CardTitle></CardHeader>
					<CardContent class="grid gap-4">
						<Textarea
							class="min-h-48"
							name="intermediateTemplate"
							value={data.settings.intermediateTemplate}
						/>
						<Textarea class="min-h-48" name="judgeTemplate" value={data.settings.judgeTemplate} />
					</CardContent>
				</Card>
			</Tabs.Content>
			<Tabs.Content value="demo" class="mt-4">
				{#if demoModelsComponent}
					{#await demoModelsComponent then { default: AdminDemoModels }}
						<AdminDemoModels
							bind:allowed
							{catalog}
							loading={catalogLoading}
							error={catalogError}
							retry={retryCatalog}
						/>
					{/await}
				{/if}
			</Tabs.Content>
		</Tabs.Root>
		<div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
			<Button class="w-full sm:w-auto" type="submit">Save admin settings</Button>
			{#if form?.message}
				<p class="text-sm break-words text-destructive">{form.message}</p>
			{/if}
		</div>
	</form>
</main>
