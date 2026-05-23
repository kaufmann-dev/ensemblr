<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import PromptInput from '$lib/components/PromptInput.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Shield, Sliders, AlertCircle, Save, Loader2 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
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

	let allowedOverrides = $state<string[] | null>(null);
	let activeTab = $derived(data.tab);

	let catalog = $state.raw<CatalogProvider[]>([]);
	let catalogLoading = $state(false);
	let catalogError = $state('');
	let catalogLoaded = $state(false);
	let demoModelsComponent = $state<Promise<typeof import('./AdminDemoModels.svelte')>>();
	let demoKeysComponent = $state<Promise<typeof import('./AdminDemoKeys.svelte')>>();

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

	function checkAndLoadTab(tab: string) {
		if (tab === 'demo') {
			demoModelsComponent ??= import('./AdminDemoModels.svelte');
			void loadCatalog();
		} else if (tab === 'demo-keys') {
			demoKeysComponent ??= import('./AdminDemoKeys.svelte');
			void loadCatalog();
		}
	}

	function setActiveTab(value: string) {
		goto(`?tab=${value}`, { noScroll: true, keepFocus: true });
		checkAndLoadTab(value);
	}

	if (browser) {
		checkAndLoadTab(untrack(() => data.tab));
	}

	function retryCatalog() {
		catalogLoaded = false;
		void loadCatalog();
	}
</script>

<svelte:head><title>Admin | Ensemblr</title></svelte:head>

<main class="relative flex-1 flex flex-col justify-start max-w-6xl mx-auto w-full px-4 py-8 space-y-6 bg-background">
	<PageHeader
		title="Admin console"
		description="Manage global Mixture-of-Agents system prompts and enabled catalog models"
		icon={Shield}
	/>

	<div class="space-y-6">
		<div class="border-b border-border pb-px">
			<Tabs.Root value={activeTab} onValueChange={setActiveTab} class="w-full">
				<Tabs.List class="w-full justify-start bg-transparent border-b-0 p-1 rounded-none gap-6 flex overflow-x-auto scrollbar-none">
					<Tabs.Trigger 
						value="prompts" 
						class="shrink-0 rounded border-b-2 border-transparent data-[state=active]:border-foreground px-1 pb-3 pt-1 font-mono text-xs uppercase tracking-wider font-bold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!"
					>
						Prompt templates
					</Tabs.Trigger>
					<Tabs.Trigger 
						value="demo" 
						class="shrink-0 rounded border-b-2 border-transparent data-[state=active]:border-foreground px-1 pb-3 pt-1 font-mono text-xs uppercase tracking-wider font-bold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!"
					>
						Demo models
					</Tabs.Trigger>
					<Tabs.Trigger 
						value="demo-keys" 
						class="shrink-0 rounded border-b-2 border-transparent data-[state=active]:border-foreground px-1 pb-3 pt-1 font-mono text-xs uppercase tracking-wider font-bold text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-transparent! dark:data-[state=active]:bg-transparent!"
					>
						Demo API Keys
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>
		
		<div class="pt-2">
			{#if activeTab === 'prompts'}
				<form method="POST" action="?/savePrompts" use:enhance class="space-y-6">
					<div class="space-y-5">
						<!-- Intermediate Prompt Template -->
						<div class="space-y-2">
							<div class="flex items-center gap-1.5">
								<Sliders class="size-3.5 text-foreground/75" />
								<Label class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Intermediate Synthesis Layer Template</Label>
							</div>
							<PromptInput
								id="intermediateTemplate"
								name="intermediateTemplate"
								bind:value={data.settings.intermediateTemplate}
								placeholder="Enter system prompt for intermediate workers..."
								minHeight="128px"
								maxHeight="320px"
							/>
							<p class="text-[10px] font-mono text-muted-foreground leading-relaxed">
								Configures how intermediate rounds synthesize context from previous worker results before final consolidation.
							</p>
						</div>

						<!-- Judge Prompt Template -->
						<div class="space-y-2 pt-3">
							<div class="flex items-center gap-1.5">
								<Shield class="size-3.5 text-foreground/75" />
								<Label class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">Final Judge Synthesis Template</Label>
							</div>
							<PromptInput
								id="judgeTemplate"
								name="judgeTemplate"
								bind:value={data.settings.judgeTemplate}
								placeholder="Enter system prompt for the final judge model..."
								minHeight="128px"
								maxHeight="320px"
							/>
							<p class="text-[10px] font-mono text-muted-foreground leading-relaxed">
								Instructs the final judge model on how to compare, evaluate, and consolidate the worker responses into a single high-quality response.
							</p>
						</div>
					</div>

					<!-- Admin Form Actions Bar -->
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center border-t border-border pt-4">
						<Button class="w-full sm:w-auto h-8.5 px-5 font-mono text-xs uppercase tracking-wider font-bold rounded shadow-none gap-2" type="submit">
							<Save class="size-3.5" />
							Save prompt templates
						</Button>
						
						{#if form?.message && form?.action === 'savePrompts'}
							<div class="rounded border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2.5">
								<AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
								<p class="text-[11px] font-mono text-destructive break-words">{form.message}</p>
							</div>
						{/if}
					</div>
				</form>
			{:else if activeTab === 'demo'}
				<form method="POST" action="?/saveDemoModels" use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success' || result.type === 'redirect') {
							allowedOverrides = null;
						}
					};
				}} class="space-y-6">
					{#if demoModelsComponent}
						{#await demoModelsComponent}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<Loader2 class="size-6 text-foreground/75 animate-spin inline-block mb-3 stroke-[1.5]" />
								<p class="text-xs font-mono text-muted-foreground">Loading demo model controls...</p>
							</div>
						{:then { default: AdminDemoModels }}
							<AdminDemoModels
								bind:allowed={
									() => allowedOverrides ?? data.settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`),
									(v) => { allowedOverrides = v; }
								}
								{catalog}
								loading={catalogLoading}
								error={catalogError}
								retry={retryCatalog}
							/>
						{/await}
					{/if}

					<!-- Admin Form Actions Bar -->
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center border-t border-border pt-4">
						<Button class="w-full sm:w-auto h-8.5 px-5 font-mono text-xs uppercase tracking-wider font-bold rounded shadow-none gap-2" type="submit">
							<Save class="size-3.5" />
							Save demo models
						</Button>
						
						{#if form?.message && form?.action === 'saveDemoModels'}
							<div class="rounded border border-destructive/20 bg-destructive/5 p-3 flex items-start gap-2.5">
								<AlertCircle class="size-4 text-destructive shrink-0 mt-0.5" />
								<p class="text-[11px] font-mono text-destructive break-words">{form.message}</p>
							</div>
						{/if}
					</div>
				</form>
			{:else if activeTab === 'demo-keys'}
				<div class="space-y-6">
					{#if !data.demoUserExists}
						<div class="flex items-start gap-3 rounded border border-destructive/20 bg-destructive/5 p-4 mt-3">
							<AlertCircle class="size-4.5 text-destructive shrink-0 mt-0.5" />
							<div class="space-y-1">
								<h4 class="text-xs font-mono font-bold text-destructive">Demo Account Not Found</h4>
								<p class="text-[10px] font-mono text-destructive/90 mt-0.5 leading-relaxed">
									The demo account has not been configured in the database yet. Please ensure the database is properly seeded before adding API keys.
								</p>
							</div>
						</div>
					{:else}
						{#if demoKeysComponent}
							{#await demoKeysComponent}
								<div class="flex flex-col items-center justify-center py-20 text-center">
									<Loader2 class="size-6 text-foreground/75 animate-spin inline-block mb-3 stroke-[1.5]" />
									<p class="text-xs font-mono text-muted-foreground">Loading demo keys controls...</p>
								</div>
							{:then { default: AdminDemoKeys }}
								{#if catalogLoading}
									<div class="flex flex-col items-center justify-center py-20 text-center">
										<Loader2 class="size-6 text-foreground/75 animate-spin inline-block mb-3 stroke-[1.5]" />
										<p class="text-xs font-mono text-muted-foreground">Loading catalog...</p>
									</div>
								{:else if catalogError}
									<div class="flex flex-col items-center justify-center py-12 text-center border border-dashed border-destructive/30 rounded bg-destructive/5 gap-3">
										<AlertCircle class="size-6 text-destructive stroke-[1.5]" />
										<div class="space-y-1 max-w-sm">
											<p class="text-xs font-mono font-bold text-destructive">Catalog Error</p>
											<p class="text-[10px] font-mono text-destructive/80">{catalogError}</p>
										</div>
										<Button 
											variant="outline" 
											size="sm" 
											class="h-7 text-[10px] font-mono mt-2" 
											onclick={retryCatalog}
										>
											Retry
										</Button>
									</div>
								{:else}
									<AdminDemoKeys
										{catalog}
										demoKeys={data.demoKeys}
										{form}
									/>
								{/if}
							{/await}
						{/if}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</main>
