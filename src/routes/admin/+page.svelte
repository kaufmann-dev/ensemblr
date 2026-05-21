<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Shield, Sparkles, Sliders, AlertCircle, Save } from '@lucide/svelte';
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
	<!-- Glowing background accent orb -->
	<div class="absolute top-[10%] left-[10%] -z-10 size-[24rem] rounded-full bg-primary/5 blur-[90px]"></div>

	<form method="POST" class="space-y-6">
		{#each allowed as model (model)}
			<input type="hidden" name="demoAllowedModels" value={model} />
		{/each}

		<div class="flex items-center gap-3 px-1">
			<div class="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary">
				<Shield class="size-4.5" />
			</div>
			<div>
				<h1 class="text-xl font-bold tracking-tight text-foreground">Admin console</h1>
				<p class="text-xs text-muted-foreground/85">Manage global Mixture-of-Agents system prompts and enabled catalog models</p>
			</div>
		</div>

		<Card class="glass-panel border-border/30 premium-glow-purple">
			<CardHeader class="pb-3 border-b border-border/20">
				<Tabs.Root value={activeTab} onValueChange={setActiveTab} class="w-full">
					<Tabs.List class="w-full max-w-fit justify-start bg-muted/20 border border-border/30 p-1 rounded-xl">
						<Tabs.Trigger value="prompts" class="rounded-lg font-bold text-xs uppercase tracking-wider px-4 py-2 transition-all">
							Prompt templates
						</Tabs.Trigger>
						<Tabs.Trigger value="demo" class="rounded-lg font-bold text-xs uppercase tracking-wider px-4 py-2 transition-all">
							Demo models
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>
			</CardHeader>
			
			<CardContent class="pt-5">
				{#if activeTab === 'prompts'}
					<div class="space-y-5">
						<!-- Intermediate Prompt Template -->
						<div class="space-y-2">
							<div class="flex items-center gap-1.5">
								<Sparkles class="size-3.5 text-primary" />
								<Label class="text-xs font-bold uppercase tracking-wider text-foreground/80">Intermediate Synthesis Layer Template</Label>
							</div>
							<Textarea
								class="min-h-48 font-mono text-xs leading-relaxed focus-visible:ring-primary/15"
								name="intermediateTemplate"
								value={data.settings.intermediateTemplate}
								placeholder="Enter system prompt for intermediate workers..."
							/>
							<p class="text-[10px] text-muted-foreground/60 leading-relaxed">
								Configures how intermediate rounds synthesize context from previous worker results before final consolidation.
							</p>
						</div>

						<!-- Judge Prompt Template -->
						<div class="space-y-2 pt-3">
							<div class="flex items-center gap-1.5">
								<Shield class="size-3.5 text-cyan-400" />
								<Label class="text-xs font-bold uppercase tracking-wider text-foreground/80">Final Judge Synthesis Template</Label>
							</div>
							<Textarea
								class="min-h-48 font-mono text-xs leading-relaxed focus-visible:ring-primary/15"
								name="judgeTemplate"
								value={data.settings.judgeTemplate}
								placeholder="Enter system prompt for the final judge model..."
							/>
							<p class="text-[10px] text-muted-foreground/60 leading-relaxed">
								Instructs the final judge model on how to compare, evaluate, and consolidate the worker responses into a single high-quality response.
							</p>
						</div>
					</div>
				{:else if activeTab === 'demo'}
					{#if demoModelsComponent}
						{#await demoModelsComponent}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<span class="animate-spin mb-3 size-6 border-2 border-primary border-t-transparent rounded-full"></span>
								<p class="text-xs text-muted-foreground">Loading demo model controls...</p>
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
			<Button class="w-full sm:w-auto h-11 px-6 font-bold shadow-lg shadow-primary/15 hover:shadow-primary/25 rounded-xl gap-2 text-sm" type="submit">
				<Save class="size-4" />
				Save admin configurations
			</Button>
			
			{#if form?.message}
				<div class="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 flex items-center gap-2">
					<AlertCircle class="size-4 text-destructive shrink-0" />
					<p class="text-xs font-semibold text-destructive break-words">{form.message}</p>
				</div>
			{/if}
		</div>
	</form>
</main>
