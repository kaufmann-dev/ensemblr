<script lang="ts">
	import { untrack } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { browser } from '$app/environment';
	import { Button } from '$lib/components/ui/button';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import PromptInput from '$lib/components/PromptInput.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Shield,
		Sliders,
		AlertCircle,
		Loader2,
		Gauge,
		Clock,
		Network,
		Globe2
	} from '@lucide/svelte';
	import AutosaveStatus from './AutosaveStatus.svelte';
	import { AutosaveController } from './autosave.svelte';
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
	let intermediateTemplate = $state(untrack(() => data.settings.intermediateTemplate));
	let judgeTemplate = $state(untrack(() => data.settings.judgeTemplate));
	let demoRateLimitWindowMinutes = $state<number | undefined>(
		untrack(() => data.settings.demoRateLimitWindowMinutes)
	);
	let demoRateLimitPerIp = $state<number | undefined>(
		untrack(() => data.settings.demoRateLimitPerIp)
	);
	let demoRateLimitGlobal = $state<number | undefined>(
		untrack(() => data.settings.demoRateLimitGlobal)
	);
	let activeTab = $derived(data.tab);

	let catalog = $state.raw<CatalogProvider[]>([]);
	let catalogLoading = $state(false);
	let catalogError = $state('');
	let catalogLoaded = $state(false);
	let demoModelsComponent = $state<Promise<typeof import('./AdminDemoModels.svelte')>>();
	let demoKeysComponent = $state<Promise<typeof import('./AdminDemoKeys.svelte')>>();

	function promptFormData() {
		const formData = new FormData();
		formData.set('intermediateTemplate', intermediateTemplate);
		formData.set('judgeTemplate', judgeTemplate);
		return formData;
	}

	function validatePrompts() {
		return intermediateTemplate.trim() && judgeTemplate.trim()
			? null
			: 'Both prompt templates are required';
	}

	function enabledDemoModels() {
		const enabled = new Set(
			catalog.flatMap((provider) =>
				provider.models
					.filter((model) => model.enabled)
					.map((model) => `${provider.id}/${model.id}`)
			)
		);
		return (
			allowedOverrides ??
			data.settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
		).filter((model) => enabled.has(model));
	}

	function demoModelsFormData() {
		const formData = new FormData();
		for (const model of enabledDemoModels()) {
			formData.append('demoAllowedModels', model);
		}
		return formData;
	}

	function validateDemoModels() {
		return catalogLoaded && !catalogLoading && !catalogError
			? null
			: 'Could not validate the live model catalog. Try again before saving demo models.';
	}

	function rateLimitsFormData() {
		const formData = new FormData();
		formData.set('demoRateLimitWindowMinutes', String(demoRateLimitWindowMinutes ?? ''));
		formData.set('demoRateLimitPerIp', String(demoRateLimitPerIp ?? ''));
		formData.set('demoRateLimitGlobal', String(demoRateLimitGlobal ?? ''));
		return formData;
	}

	function validateRateLimits() {
		const values = [
			[demoRateLimitWindowMinutes, 10080],
			[demoRateLimitPerIp, 100000],
			[demoRateLimitGlobal, 100000]
		] as const;
		return values.every(
			([value, max]) => Number.isInteger(value) && value !== undefined && value >= 1 && value <= max
		)
			? null
			: 'Rate limits must be positive whole numbers within the allowed ranges';
	}

	const promptAutosave = new AutosaveController({
		action: '?/savePrompts',
		delay: 1000,
		getFormData: promptFormData,
		validate: validatePrompts
	});
	const demoModelsAutosave = new AutosaveController({
		action: '?/saveDemoModels',
		delay: 500,
		getFormData: demoModelsFormData,
		validate: validateDemoModels
	});
	const rateLimitsAutosave = new AutosaveController({
		action: '?/saveRateLimits',
		delay: 0,
		getFormData: rateLimitsFormData,
		validate: validateRateLimits
	});

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

	function activeAutosave() {
		if (activeTab === 'prompts') return promptAutosave;
		if (activeTab === 'demo') return demoModelsAutosave;
		if (activeTab === 'rate-limits') return rateLimitsAutosave;
		return null;
	}

	function hasUnsavedChanges() {
		return [promptAutosave, demoModelsAutosave, rateLimitsAutosave].some(
			(controller) => controller.dirty || controller.saving
		);
	}

	async function setActiveTab(value: string) {
		if (value === activeTab) return;
		const controller = activeAutosave();
		if (controller && !(await controller.flush())) return;

		checkAndLoadTab(value);
		await goto(resolve(`/admin?tab=${value}`), { noScroll: true, keepFocus: true });
	}

	if (browser) {
		checkAndLoadTab(untrack(() => data.tab));
	}

	function retryCatalog() {
		catalogLoaded = false;
		void loadCatalog();
	}

	function handleDemoSelectionChange(allowed: string[]) {
		allowedOverrides = allowed;
		demoModelsAutosave.schedule();
	}

	function handleBeforeUnload(event: BeforeUnloadEvent) {
		if (!hasUnsavedChanges()) return;
		event.preventDefault();
		event.returnValue = '';
	}

	beforeNavigate((navigation) => {
		if (!hasUnsavedChanges()) return;
		if (navigation.willUnload) {
			navigation.cancel();
			return;
		}
		if (!window.confirm('You have unsaved admin changes. Leave this page?')) {
			navigation.cancel();
		}
	});
</script>

<svelte:head><title>Admin | Ensemblr</title></svelte:head>
<svelte:window onbeforeunload={handleBeforeUnload} />

<main
	class="relative mx-auto flex w-full max-w-6xl flex-1 flex-col justify-start space-y-6 bg-background px-4 py-8"
>
	<PageHeader
		title="Admin console"
		description="Manage global Mixture-of-Agents system prompts and enabled catalog models"
		icon={Shield}
	/>

	<div class="space-y-6">
		<div class="border-b border-border pb-px">
			<Tabs.Root value={activeTab} onValueChange={setActiveTab} class="w-full">
				<Tabs.List
					class="flex w-full scrollbar-none justify-start gap-6 overflow-x-auto rounded-none border-b-0 bg-transparent p-1"
				>
					<Tabs.Trigger
						value="prompts"
						class="shrink-0 rounded border-b-2 border-transparent px-1 pt-1 pb-3 font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent! data-[state=active]:text-foreground dark:data-[state=active]:bg-transparent!"
					>
						Prompt templates
					</Tabs.Trigger>
					<Tabs.Trigger
						value="demo"
						class="shrink-0 rounded border-b-2 border-transparent px-1 pt-1 pb-3 font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent! data-[state=active]:text-foreground dark:data-[state=active]:bg-transparent!"
					>
						Demo models
					</Tabs.Trigger>
					<Tabs.Trigger
						value="demo-keys"
						class="shrink-0 rounded border-b-2 border-transparent px-1 pt-1 pb-3 font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent! data-[state=active]:text-foreground dark:data-[state=active]:bg-transparent!"
					>
						Demo API Keys
					</Tabs.Trigger>
					<Tabs.Trigger
						value="rate-limits"
						class="shrink-0 rounded border-b-2 border-transparent px-1 pt-1 pb-3 font-mono text-xs font-bold tracking-wider text-muted-foreground uppercase data-[state=active]:border-foreground data-[state=active]:bg-transparent! data-[state=active]:text-foreground dark:data-[state=active]:bg-transparent!"
					>
						Rate limits
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<div class="pt-2">
			{#if activeTab === 'prompts'}
				<form
					method="POST"
					action="?/savePrompts"
					class="space-y-6"
					oninput={() => promptAutosave.schedule()}
					onsubmit={(event) => {
						event.preventDefault();
						void promptAutosave.flush();
					}}
				>
					<AutosaveStatus controller={promptAutosave} />
					<div class="space-y-5">
						<!-- Intermediate Prompt Template -->
						<div class="space-y-2">
							<div class="flex items-center gap-1.5">
								<Sliders class="size-3.5 text-foreground/75" />
								<Label>Intermediate Synthesis Layer Template</Label>
							</div>
							<PromptInput
								id="intermediateTemplate"
								name="intermediateTemplate"
								bind:value={intermediateTemplate}
								placeholder="Enter system prompt for intermediate workers..."
								minHeight="128px"
								maxHeight="320px"
							/>
							<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
								Configures how intermediate rounds synthesize context from previous worker results
								before final consolidation.
							</p>
						</div>

						<!-- Judge Prompt Template -->
						<div class="space-y-2 pt-3">
							<div class="flex items-center gap-1.5">
								<Shield class="size-3.5 text-foreground/75" />
								<Label>Final Judge Synthesis Template</Label>
							</div>
							<PromptInput
								id="judgeTemplate"
								name="judgeTemplate"
								bind:value={judgeTemplate}
								placeholder="Enter system prompt for the final judge model..."
								minHeight="128px"
								maxHeight="320px"
							/>
							<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
								Instructs the final judge model on how to compare, evaluate, and consolidate the
								worker responses into a single high-quality response.
							</p>
						</div>
					</div>
				</form>
			{:else if activeTab === 'demo'}
				<form
					method="POST"
					action="?/saveDemoModels"
					class="space-y-6"
					onsubmit={(event) => {
						event.preventDefault();
						void demoModelsAutosave.flush();
					}}
				>
					<AutosaveStatus controller={demoModelsAutosave} />
					{#if demoModelsComponent}
						{#await demoModelsComponent}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<Loader2
									class="mb-3 inline-block size-6 animate-spin stroke-[1.5] text-foreground/75"
								/>
								<p class="font-mono text-xs text-muted-foreground">
									Loading demo model controls...
								</p>
							</div>
						{:then { default: AdminDemoModels }}
							<AdminDemoModels
								bind:allowed={
									() =>
										allowedOverrides ??
										data.settings.demoAllowedModels.map(
											(model) => `${model.providerId}/${model.modelId}`
										),
									(v) => {
										allowedOverrides = v;
									}
								}
								{catalog}
								loading={catalogLoading}
								error={catalogError}
								retry={retryCatalog}
								onSelectionChange={handleDemoSelectionChange}
							/>
						{/await}
					{/if}
				</form>
			{:else if activeTab === 'rate-limits'}
				<form
					method="POST"
					action="?/saveRateLimits"
					class="space-y-6"
					onchange={() => rateLimitsAutosave.schedule()}
					onfocusout={() => rateLimitsAutosave.schedule()}
					onsubmit={(event) => {
						event.preventDefault();
						rateLimitsAutosave.schedule();
						void rateLimitsAutosave.flush();
					}}
				>
					<AutosaveStatus controller={rateLimitsAutosave} />
					<div class="space-y-5">
						<div>
							<div class="flex items-center gap-1.5">
								<Gauge class="size-3.5 text-foreground/75" />
								<h3 class="font-mono text-xs font-bold tracking-tight text-foreground uppercase">
									Demo generation rate limits
								</h3>
							</div>
							<p class="mt-0.5 font-mono text-xs text-muted-foreground/80">
								Control how often demo users can start paid API generations
							</p>
						</div>

						<div class="grid gap-4 md:grid-cols-3">
							<div class="space-y-2">
								<div class="flex items-center gap-1.5">
									<Clock class="size-3.5 text-foreground/75" />
									<Label for="demoRateLimitWindowMinutes">Window minutes</Label>
								</div>
								<Input
									id="demoRateLimitWindowMinutes"
									name="demoRateLimitWindowMinutes"
									type="number"
									min="1"
									step="1"
									bind:value={demoRateLimitWindowMinutes}
									class="font-mono text-xs"
								/>
								<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
									Length of each shared quota window.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-1.5">
									<Network class="size-3.5 text-foreground/75" />
									<Label for="demoRateLimitPerIp">Per IP limit</Label>
								</div>
								<Input
									id="demoRateLimitPerIp"
									name="demoRateLimitPerIp"
									type="number"
									min="1"
									step="1"
									bind:value={demoRateLimitPerIp}
									class="font-mono text-xs"
								/>
								<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
									Maximum demo generations per client address.
								</p>
							</div>

							<div class="space-y-2">
								<div class="flex items-center gap-1.5">
									<Globe2 class="size-3.5 text-foreground/75" />
									<Label for="demoRateLimitGlobal">Global limit</Label>
								</div>
								<Input
									id="demoRateLimitGlobal"
									name="demoRateLimitGlobal"
									type="number"
									min="1"
									step="1"
									bind:value={demoRateLimitGlobal}
									class="font-mono text-xs"
								/>
								<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
									Maximum total demo generations across all visitors.
								</p>
							</div>
						</div>

						<div class="rounded border border-border bg-muted/20 p-3">
							<p class="font-mono text-[10px] leading-relaxed text-muted-foreground">
								Current policy: <span class="font-bold text-foreground">{demoRateLimitPerIp}</span>
								per IP and <span class="font-bold text-foreground">{demoRateLimitGlobal}</span>
								total every
								<span class="font-bold text-foreground">{demoRateLimitWindowMinutes}</span> minutes.
							</p>
						</div>
					</div>
				</form>
			{:else if activeTab === 'demo-keys'}
				<div class="space-y-6">
					{#if !data.demoUserExists}
						<div
							class="mt-3 flex items-start gap-3 rounded border border-destructive/20 bg-destructive/5 p-4"
						>
							<AlertCircle class="mt-0.5 size-4.5 shrink-0 text-destructive" />
							<div class="space-y-1">
								<h4 class="font-mono text-xs font-bold text-destructive">Demo Account Not Found</h4>
								<p class="mt-0.5 font-mono text-[10px] leading-relaxed text-destructive/90">
									The demo account has not been configured in the database yet. Please ensure the
									database is properly seeded before adding API keys.
								</p>
							</div>
						</div>
					{:else if demoKeysComponent}
						{#await demoKeysComponent}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<Loader2
									class="mb-3 inline-block size-6 animate-spin stroke-[1.5] text-foreground/75"
								/>
								<p class="font-mono text-xs text-muted-foreground">Loading demo keys controls...</p>
							</div>
						{:then { default: AdminDemoKeys }}
							{#if catalogLoading}
								<div class="flex flex-col items-center justify-center py-20 text-center">
									<Loader2
										class="mb-3 inline-block size-6 animate-spin stroke-[1.5] text-foreground/75"
									/>
									<p class="font-mono text-xs text-muted-foreground">Loading catalog...</p>
								</div>
							{:else if catalogError}
								<div
									class="flex flex-col items-center justify-center gap-3 rounded border border-dashed border-destructive/30 bg-destructive/5 py-12 text-center"
								>
									<AlertCircle class="size-6 stroke-[1.5] text-destructive" />
									<div class="max-w-sm space-y-1">
										<p class="font-mono text-xs font-bold text-destructive">Catalog Error</p>
										<p class="font-mono text-[10px] text-destructive/80">{catalogError}</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										class="mt-2 h-7 font-mono text-[10px]"
										onclick={retryCatalog}
									>
										Retry
									</Button>
								</div>
							{:else}
								<AdminDemoKeys {catalog} demoKeys={data.demoKeys} {form} />
							{/if}
						{/await}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</main>
