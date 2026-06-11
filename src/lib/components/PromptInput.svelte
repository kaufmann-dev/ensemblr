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
		minHeight = '96px', // Standard height (96px = min-h-24)
		maxHeight = '256px', // Standard cutoff (256px = max-h-64)
		showCharCount = false,
		monospace = true,
		class: className = ''
	} = $props();
</script>

<div class="space-y-2 {className}">
	{#if label || showCharCount}
		<div class="flex items-center justify-between">
			{#if label}
				<Label for={id}>{label}</Label>
			{/if}
			{#if showCharCount}
				<span class="font-mono text-[9px] text-muted-foreground/60 tabular-nums">
					{value.length} chars
				</span>
			{/if}
		</div>
	{/if}

	<Textarea
		{id}
		{name}
		class={[
			'resize-none p-3',
			monospace ? 'font-mono text-xs' : 'font-sans text-sm leading-relaxed'
		]}
		style="min-height: {minHeight} !important; max-height: {maxHeight} !important;"
		{placeholder}
		{disabled}
		bind:value
	/>
</div>
