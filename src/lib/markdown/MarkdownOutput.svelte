<script lang="ts">
	import { untrack } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { parseMarkdown } from './parser';
	import MarkdownNode from './MarkdownNode.svelte';
	import type { MarkdownRoot } from './types';

	let { source, class: className = '' }: { source: string; class?: string } = $props();

	function initialParse(value: string): MarkdownRoot | null {
		try {
			return parseMarkdown(value);
		} catch {
			return null;
		}
	}

	const initialSource = untrack(() => source);
	const initialTree = initialParse(initialSource);
	let parsedSource = initialSource;
	let tree = $state.raw<MarkdownRoot | null>(initialTree);
	let fallback = $state(initialTree ? '' : initialSource);

	function scheduleParse(nextSource: string): Attachment<HTMLElement> {
		return () => {
			if (nextSource === parsedSource) return;

			const frame = requestAnimationFrame(() => {
				parsedSource = nextSource;
				try {
					tree = parseMarkdown(nextSource);
					fallback = '';
				} catch {
					tree = null;
					fallback = nextSource;
				}
			});

			return () => cancelAnimationFrame(frame);
		};
	}
</script>

<div
	{@attach scheduleParse(source)}
	class={['markdown-output text-[13px] break-words text-foreground/90 select-text', className]}
>
	{#if tree}
		<MarkdownNode node={tree} />
	{:else}
		<pre class="font-sans leading-relaxed whitespace-pre-wrap">{fallback}</pre>
	{/if}
</div>

<style>
	.markdown-output {
		font-variation-settings: 'MONO' 0;
	}

	.markdown-output :global(code),
	.markdown-output :global(pre code) {
		font-family: 'Recursive Variable', sans-serif;
		font-variation-settings: 'MONO' 1;
	}
</style>
