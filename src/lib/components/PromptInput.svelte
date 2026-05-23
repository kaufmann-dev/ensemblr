<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	let {
		id = 'prompt',
		name = '',
		label = '',
		value = $bindable(''),
		placeholder = '',
		disabled = false,
		minHeightClass = 'min-h-24',
		maxHeightClass = 'max-h-64',
		showCharCount = false,
		class: className = ''
	} = $props();
</script>

<div class="space-y-2 {className}">
	{#if label || showCharCount}
		<div class="flex justify-between items-center">
			{#if label}
				<Label for={id} class="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/90">{label}</Label>
			{/if}
			{#if showCharCount}
				<span class="text-[9px] font-mono text-muted-foreground/60 tabular-nums">
					{value.length} chars
				</span>
			{/if}
		</div>
	{/if}
	
	<Textarea
		{id}
		{name}
		class="resize-none overflow-y-auto font-mono text-xs p-3 {minHeightClass} !{maxHeightClass}"
		{placeholder}
		{disabled}
		bind:value
	/>
</div>
