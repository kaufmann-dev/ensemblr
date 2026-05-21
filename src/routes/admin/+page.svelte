<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Shield, Sliders, AlertCircle, Save, Loader2 } from '@lucide/svelte';
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

<main class="relative flex-1 flex flex-col justify-start max-w-6xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<form method="POST" class="space-y-6">
		{#each allowed as model (model)}
			<input type="hidden" name="demoAllowedModels" value={model} />
		{/each}

		<div class="flex items-center gap-3 px-1">
			<div class="flex size-9 items-center justify-center rounded border border-border bg-muted/20 text-foreground">
				<Shield class="size-4.5" />
			</div>
			<div>
				<h1 class="text-base font-bold font-mono uppercase tracking-tight text-foreground">Admin console</h1>
				<p class="text-xs font-mono text-muted-foreground mt-0.5">Manage global Mixture-of-Agents system prompts and enabled catalog models</p>
			</div>
		</div>

		<Card class="border border-border bg-card rounded shadow-xs">
			<CardHeader class="pb-0 pt-4 px-4 border-b border-border">
				<Tabs.Root value={activeTab} onValueChange={setActiveTab} class="w-full">
					<Tabs.List class="w-full justify-start bg-transparent border-b-0 p-0 rounded-none gap-6 flex">
						<Tabs.Trigger 
							value="prompts" 
							class="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground px-1 pb-3 pt-1 font-mono text-xs uppercase tracking-wider font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
						>
							Prompt templates
						</Tabs.Trigger>
						<Tabs.Trigger 
							value="demo" 
							class="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground px-1 pb-3 pt-1 font-mono text-xs uppercase tracking-wider font-bold transition-all text-muted-foreground data-[state=active]:text-foreground"
						>
							Demo models
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</CardHeader>
			
			<CardContent class="pt-5 px-4">
				{#if activeTab === 'prompts'}
					<div class="space-y-5">
						<!-- Intermediate Prompt Template -->
						<div class="space-y-2">
							<div class="flex items-center gap-1.5">
								<Sliders class="size-3.5 text-foreground/75" />
								<Label class="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">Intermediate Synthesis Layer Template</Label>
							</div>
							<Textarea
								class="min-h-48 font-mono text-xs leading-relaxed border border-border focus-visible:ring-1 focus-visible:ring-foreground rounded"
								name="intermediateTemplate"
								value={data.settings.intermediateTemplate}
								placeholder="Enter system prompt for intermediate workers..."
							/>
							<p class="text-[10px] font-mono text-muted-foreground leading-relaxed">
								Configures how intermediate rounds synthesize context from previous worker results before final consolidation.
							</p>
						</div>

						<!-- Judge Prompt Template -->
						<div class="space-y-2 pt-3">
							<div class="flex items-center gap-1.5">
								<Shield class="size-3.5 text-foreground/75" />
								<Label class="text-[10px] font-mono font-bold uppercase tracking-wider text-foreground">Final Judge Synthesis Template</Label>
							</div>
							<Textarea
								class="min-h-48 font-mono text-xs leading-relaxed border border-border focus-visible:ring-1 focus-visible:ring-foreground rounded"
								name="judgeTemplate"
								value={data.settings.judgeTemplate}
								placeholder="Enter system prompt for the final judge model..."
							/>
							<p class="text-[10px] font-mono text-muted-foreground leading-relaxed">
								Instructs the final judge model on how to compare, evaluate, and consolidate the worker responses into a single high-quality response.
							</p>
						</div>
					</div>
				{:else if activeTab === 'demo'}
					{#if demoModelsComponent}
						{#await demoModelsComponent}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<Loader2 class="size-6 text-foreground/75 animate-spin mb-3 stroke-[1.5]" />
								<p class="text-xs font-mono text-muted-foreground">Loading demo model controls...</p>
							</div>
						{:then { default: AdminDemoModels }}
							<AdminDemoModels
								bind:allowed
								{catalog}
								loading={catalogLoading}
								error={catalogError}
								retry={retryCatalog}
							/>
						{/await}
					{/if}
				{/if}
			</CardContent>
		</Card>

		<!-- Admin Form Actions Bar -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-center border-t border-border/20 pt-4">
			<Button class="w-full sm:w-auto h-10 px-5 font-mono text-xs uppercase tracking-wider font-bold rounded bg-foreground text-background hover:bg-foreground/90 transition-all gap-2" type="submit">
				<Save class="size-3.5" />
				Save admin configurations
			</Button>
			
			{#if form?.message}
				<div class="rounded border border-destructive/20 bg-destructive/5 px-4 py-2 flex items-center gap-2">
					<AlertCircle class="size-3.5 text-destructive shrink-0" />
					<p class="text-xs font-mono text-destructive break-words">{form.message}</p>
				</div>
			{/if}
		</div>
	</form>
</main>
