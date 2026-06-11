<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import type { Pathname } from '$app/types';
	import { ArrowLeft } from '@lucide/svelte';
	import { resolve } from '$app/paths';

	let {
		title,
		description,
		icon: Icon = undefined,
		backHref = undefined,
		badge = undefined
	}: {
		title: string;
		description: string;
		icon?: Component<{ class?: string }>;
		backHref?: Pathname;
		badge?: Snippet;
	} = $props();
</script>

<div class="flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center">
	<div class="flex min-w-0 items-start gap-3 sm:items-center">
		{#if backHref}
			<a
				href={resolve(backHref)}
				class="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-muted/20 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
				aria-label="Go back"
			>
				<ArrowLeft class="size-4.5" />
			</a>
		{:else if Icon}
			<div
				class="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-muted/20 text-foreground"
			>
				<Icon class="size-4.5" />
			</div>
		{/if}
		<div class="min-w-0">
			<h1
				class="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-base font-bold tracking-tight text-foreground uppercase"
			>
				{title}
				{#if badge}
					{@render badge()}
				{/if}
			</h1>
			<p class="mt-0.5 font-mono text-xs leading-snug break-words text-muted-foreground">
				{description}
			</p>
		</div>
	</div>
</div>
