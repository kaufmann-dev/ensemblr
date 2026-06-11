<script lang="ts">
	import GenerationStatus from '$lib/components/GenerationStatus.svelte';
	import MarkdownOutput from '$lib/markdown/MarkdownOutput.svelte';

	let {
		role,
		label,
		source,
		status = '',
		primary = false
	}: {
		role: 'user' | 'assistant';
		label: string;
		source: string;
		status?: string;
		primary?: boolean;
	} = $props();
</script>

<article
	class={[
		'min-w-0',
		role === 'user'
			? 'ml-auto w-full max-w-[90%] rounded border border-border bg-muted/40 px-4 py-3 sm:max-w-[82%]'
			: 'w-full',
		primary && 'rounded border border-border bg-card px-4 py-4 sm:px-5'
	]}
	aria-label={`${label} message`}
>
	<header class="mb-2 flex items-center justify-between gap-3">
		<h2 class="text-sm font-semibold text-foreground">{label}</h2>
		{#if status}
			<GenerationStatus {status} />
		{/if}
	</header>

	{#if source}
		<MarkdownOutput {source} class="text-[14px]" />
	{:else}
		<p class="text-sm leading-relaxed text-muted-foreground">
			The final judge is synthesizing the worker responses.
		</p>
	{/if}
</article>
