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

	function autoExpand(_value: typeof value) {
		return (node: HTMLTextAreaElement) => {
			const updateHeight = () => {
				const styles = getComputedStyle(node);
				const borderHeight =
					Number.parseFloat(styles.borderTopWidth) + Number.parseFloat(styles.borderBottomWidth);
				const maxHeight = Number.parseFloat(styles.maxHeight);

				node.style.overflowY = 'hidden';
				node.style.height = 'auto';
				const requiredHeight = node.scrollHeight + borderHeight;
				node.style.height = `${requiredHeight}px`;
				node.style.overflowY =
					Number.isFinite(maxHeight) && requiredHeight > maxHeight ? 'auto' : 'hidden';
			};

			updateHeight();
			node.addEventListener('input', updateHeight);

			return () => {
				node.removeEventListener('input', updateHeight);
			};
		};
	}
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'flex min-h-16 w-full resize-none rounded border border-border bg-card px-3 py-3 text-base transition-all duration-150 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-destructive md:text-sm',
		className
	)}
	bind:value
	{@attach autoExpand(value)}
	{...restProps}
></textarea>
