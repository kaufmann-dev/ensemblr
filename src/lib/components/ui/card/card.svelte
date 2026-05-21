<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		size = 'default',
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & { size?: 'default' | 'sm' } = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	data-size={size}
	class={cn(
		'group/card flex flex-col gap-6 overflow-hidden rounded-2xl bg-card/65 backdrop-blur-xl border border-border/40 py-6 text-sm text-card-foreground shadow-lg transition-all duration-300 hover:border-border/60 hover:shadow-xl has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
