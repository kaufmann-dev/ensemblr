<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { CircleCheck, CircleX, Loader2 } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		status,
		compact = false,
		class: className
	}: {
		status: string;
		compact?: boolean;
		class?: ClassValue;
	} = $props();

	let display = $derived(
		status === 'completed'
			? { icon: CircleCheck, label: 'Completed', color: 'text-foreground' }
			: status === 'failed'
				? { icon: CircleX, label: 'Failed', color: 'text-destructive' }
				: { icon: Loader2, label: 'Running', color: 'text-muted-foreground' }
	);
	let Icon = $derived(display.icon);
</script>

{#if compact}
	<span class={cn('inline-flex items-center', display.color, className)}>
		<Icon class={cn('size-3.5', status === 'running' && 'animate-spin')} />
		<span class="sr-only">{display.label}</span>
	</span>
{:else}
	<span
		class={cn(
			'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium',
			status === 'completed'
				? 'border-border bg-muted/50 text-foreground'
				: status === 'failed'
					? 'border-destructive/30 bg-destructive/5 text-destructive'
					: 'border-border bg-muted text-muted-foreground',
			className
		)}
	>
		<Icon class={cn('size-3', status === 'running' && 'animate-spin')} />
		{display.label}
	</span>
{/if}
