<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { Attachment } from 'svelte/attachments';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildren<WithElementRef<HTMLAttributes<HTMLDivElement>>> = $props();

	const attachRef: Attachment<HTMLDivElement> = (element) => {
		ref = element;

		return () => {
			if (ref === element) ref = null;
		};
	};
</script>

<div
	{@attach attachRef}
	data-slot="skeleton"
	class={cn('animate-pulse rounded-2xl bg-muted', className)}
	{...restProps}
></div>
