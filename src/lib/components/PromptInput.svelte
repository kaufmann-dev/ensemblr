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
		minHeight = '72px',
		maxHeight = '256px',
		showCharCount = false,
		onsubmit = undefined,
		class: className = ''
	}: {
		id?: string;
		name?: string;
		label?: string;
		value?: string;
		placeholder?: string;
		disabled?: boolean;
		minHeight?: string;
		maxHeight?: string;
		showCharCount?: boolean;
		onsubmit?: () => void;
		class?: string;
	} = $props();

	function onkeydown(event: KeyboardEvent) {
		if (onsubmit && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			onsubmit();
		}
	}
</script>

<div class="space-y-2 {className}">
	{#if label || showCharCount}
		<div class="flex items-center justify-between">
			{#if label}
				<Label for={id}>{label}</Label>
			{/if}
			{#if showCharCount}
				<span class="text-xs text-muted-foreground tabular-nums">
					{value.length} characters
				</span>
			{/if}
		</div>
	{/if}

	<Textarea
		{id}
		{name}
		class="resize-none p-3 text-sm"
		style="min-height: {minHeight} !important; max-height: {maxHeight} !important;"
		{placeholder}
		{disabled}
		{onkeydown}
		bind:value
	/>
</div>
