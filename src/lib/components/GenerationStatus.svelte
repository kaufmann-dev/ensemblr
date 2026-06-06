<script lang="ts">
	import type { ClassValue } from 'svelte/elements';
	import { cn } from '$lib/utils.js';

	let {
		status,
		class: className
	}: {
		status: string;
		class?: ClassValue;
	} = $props();
</script>

<span
	class={cn(
		'rounded border px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide uppercase',
		status === 'completed'
			? 'border-border bg-foreground/5 text-foreground'
			: status === 'failed'
				? 'border-destructive/30 bg-destructive/5 text-destructive'
				: 'animate-pulse border-border bg-muted text-muted-foreground',
		className
	)}
>
	{status}
</span>
