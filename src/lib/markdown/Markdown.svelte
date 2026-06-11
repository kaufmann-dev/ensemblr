<script lang="ts">
	import type { Root } from 'mdast';
	import type { ClassValue } from 'svelte/elements';
	import { cn } from '$lib/utils';
	import { parseMarkdown } from './parse';
	import MarkdownNode from './MarkdownNode.svelte';

	let {
		text,
		streaming = false,
		class: className
	}: {
		text: string;
		streaming?: boolean;
		class?: ClassValue;
	} = $props();

	let streamedTree = $state<Root | undefined>();
	let frame = 0;

	// While streaming, parse the accumulated text at most once per
	// animation frame; the scheduled frame reads the latest text.
	$effect(() => {
		void text;
		if (!streaming || frame !== 0) return;
		frame = requestAnimationFrame(() => {
			frame = 0;
			streamedTree = parseMarkdown(text);
		});
	});

	$effect(() => {
		return () => cancelAnimationFrame(frame);
	});

	let tree = $derived(streaming ? streamedTree : parseMarkdown(text));
</script>

<div class={cn('markdown min-w-0 text-sm leading-relaxed', className)}>
	{#if tree}
		{#each tree.children as node, index (index)}
			<MarkdownNode {node} />
		{/each}
	{:else if text}
		<p class="whitespace-pre-wrap">{text}</p>
	{/if}
</div>

<style>
	.markdown :global(> :first-child) {
		margin-top: 0;
	}

	.markdown :global(> :last-child) {
		margin-bottom: 0;
	}

	.markdown :global(p) {
		margin-block: 0.75em;
	}

	.markdown :global(h1),
	.markdown :global(h2),
	.markdown :global(h3),
	.markdown :global(h4),
	.markdown :global(h5),
	.markdown :global(h6) {
		margin-block: 1.1em 0.5em;
		font-weight: 650;
		line-height: 1.3;
	}

	.markdown :global(h1) {
		font-size: 1.3em;
	}

	.markdown :global(h2) {
		font-size: 1.2em;
	}

	.markdown :global(h3) {
		font-size: 1.1em;
	}

	.markdown :global(h4),
	.markdown :global(h5),
	.markdown :global(h6) {
		font-size: 1em;
	}

	.markdown :global(ul),
	.markdown :global(ol) {
		margin-block: 0.75em;
		padding-inline-start: 1.5em;
	}

	.markdown :global(ul) {
		list-style: disc;
	}

	.markdown :global(ol) {
		list-style: decimal;
	}

	.markdown :global(li) {
		margin-block: 0.25em;
	}

	.markdown :global(blockquote) {
		margin-block: 0.75em;
		border-inline-start: 3px solid var(--border);
		padding-inline-start: 1em;
		color: var(--muted-foreground);
	}

	.markdown :global(code) {
		font-variation-settings: 'MONO' 1;
		font-size: 0.9em;
	}

	.markdown :global(:not(pre) > code) {
		border-radius: var(--radius-sm);
		background: color-mix(in oklab, var(--muted) 70%, transparent);
		padding: 0.1em 0.35em;
	}

	.markdown :global(pre) {
		margin-block: 0.75em;
		overflow-x: auto;
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		background: color-mix(in oklab, var(--muted) 45%, transparent);
		padding: 0.75em 1em;
	}

	.markdown :global(a) {
		color: var(--foreground);
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.markdown :global(hr) {
		margin-block: 1.25em;
		border-color: var(--border);
	}

	.markdown :global(.table-wrapper) {
		margin-block: 0.75em;
		overflow-x: auto;
	}

	.markdown :global(table) {
		min-width: 50%;
		border-collapse: collapse;
	}

	.markdown :global(th),
	.markdown :global(td) {
		border: 1px solid var(--border);
		padding: 0.35em 0.75em;
		text-align: start;
	}

	.markdown :global(th) {
		background: color-mix(in oklab, var(--muted) 60%, transparent);
		font-weight: 600;
	}
</style>
