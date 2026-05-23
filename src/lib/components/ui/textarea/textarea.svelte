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

	// Clean Svelte action to handle auto-expansion on mount and value changes
	function autoExpand(node: HTMLTextAreaElement, currentVal: any) {
		const updateHeight = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};

		// Run initially on mount to fit pre-populated templates
		updateHeight();

		return {
			update() {
				// Automatically called by Svelte whenever the bound parameter value changes
				updateHeight();
			}
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
	use:autoExpand={value}
	{...restProps}
></textarea>
