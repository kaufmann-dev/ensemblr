<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';

	let {
		title,
		description,
		icon: Icon = undefined,
		backHref = undefined,
		badge = undefined,
		actions = undefined
	}: {
		title: string;
		description: string;
		icon?: Component<{ class?: string }>;
		backHref?: string;
		badge?: Snippet;
		actions?: Snippet;
	} = $props();
</script>

<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
	<div class="flex items-center gap-3">
		{#if backHref}
			<a
				href={resolve(backHref as Pathname)}
				class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/20 text-muted-foreground hover:bg-muted hover:text-foreground"
				aria-label="Go back"
			>
				<ArrowLeft class="size-4" />
			</a>
		{:else if Icon}
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/20 text-foreground"
			>
				<Icon class="size-4" />
			</div>
		{/if}
		<div>
			<h1 class="flex items-center gap-2.5 text-base font-semibold text-foreground">
				{title}
				{#if badge}
					{@render badge()}
				{/if}
			</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">{description}</p>
		</div>
	</div>
	{#if actions}
		<div class="flex shrink-0 items-center gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
