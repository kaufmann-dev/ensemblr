<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let allowed = $derived(
		data.settings.demoAllowedModels.map((model) => `${model.providerId}/${model.modelId}`)
	);

	function toggleAllowed(value: string) {
		allowed = allowed.includes(value)
			? allowed.filter((item) => item !== value)
			: [...allowed, value];
	}
</script>

<svelte:head><title>Admin | Ensemblr</title></svelte:head>

<main class="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-6">
	<form method="POST">
		{#each allowed as model (model)}
			<input type="hidden" name="demoAllowedModels" value={model} />
		{/each}
		<Tabs.Root value="prompts">
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
				<Card>
					<CardHeader><CardTitle>Demo allowed models</CardTitle></CardHeader>
					<CardContent>
						<ScrollArea class="max-h-[32rem]">
							<div class="grid gap-2 pr-1">
								{#each data.catalog as provider (provider.id)}
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
					</CardContent>
				</Card>
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
