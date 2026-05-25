<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();

	function autoExpand(node: HTMLTextAreaElement) {
		const updateHeight = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};

		$effect(() => {
			value;
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		});

		node.addEventListener('input', updateHeight);

		return () => {
			node.removeEventListener('input', updateHeight);
		};
	}
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'flex field-sizing-content min-h-16 w-full resize-none rounded border border-border bg-card px-3 py-3 text-base transition-all duration-150 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive md:text-sm',
		className
	)}
	bind:value
	{@attach autoExpand}
	{...restProps}
></textarea>
