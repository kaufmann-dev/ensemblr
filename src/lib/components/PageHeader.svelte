<script lang="ts">
	import type { Component, Snippet } from 'svelte';
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
		backHref?: string;
		badge?: Snippet;
	} = $props();
</script>

<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
	<div class="flex items-center gap-3">
		{#if backHref}
			<a
				href={resolve(backHref as any)}
				class="flex size-9 items-center justify-center rounded border border-border bg-muted/20 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all shrink-0"
				aria-label="Go back"
			>
				<ArrowLeft class="size-4.5" />
			</a>
		{:else if Icon}
			<div class="flex size-9 items-center justify-center rounded border border-border bg-muted/20 text-foreground shrink-0">
				<Icon class="size-4.5" />
			</div>
		{/if}
		<div>
			<h1 class="text-base font-bold font-mono uppercase tracking-tight text-foreground flex items-center gap-2.5">
				{title}
				{#if badge}
					{@render badge()}
				{/if}
			</h1>
			<p class="text-xs font-mono text-muted-foreground mt-0.5">{description}</p>
		</div>
	</div>
</div>
