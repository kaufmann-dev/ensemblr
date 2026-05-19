<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let allowed = $state<string[]>(
		data.settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
	);
</script>

<svelte:head><title>Admin | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-6xl px-4 py-6">
	<form method="POST">
		<Tabs.Root value="prompts">
			<Tabs.List>
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
				<Card>
					<CardHeader><CardTitle>Demo allowed models</CardTitle></CardHeader>
					<CardContent class="grid max-h-[32rem] gap-2 overflow-auto">
						{#each data.catalog as provider (provider.id)}
							<div class="rounded-md border p-3">
								<div class="mb-2 flex items-center gap-2">
									<img class="size-5" src={provider.logoUrl} alt="" />
									<strong>{provider.name}</strong>
									{#if provider.enabled}
										<Badge variant="secondary">enabled</Badge>
									{:else}
										<Badge variant="outline">catalog only</Badge>
									{/if}
								</div>
								<div class="grid gap-2 md:grid-cols-2">
									{#each provider.models as model (model.id)}
										<label class="flex items-center gap-2 text-sm">
											<input
												type="checkbox"
												name="demoAllowedModels"
												value="{provider.id}/{model.id}"
												bind:group={allowed}
												disabled={!model.enabled}
											/>
											<span>{model.name ?? model.id}</span>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</CardContent>
				</Card>
			</Tabs.Content>
		</Tabs.Root>
		<div class="mt-4 flex items-center gap-3">
			<Button type="submit">Save admin settings</Button>
			{#if form?.message}
				<p class="text-sm text-destructive">{form.message}</p>
			{/if}
		</div>
	</form>
</main>
