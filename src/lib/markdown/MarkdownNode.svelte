<script lang="ts">
	import Self from './MarkdownNode.svelte';
	import type { MarkdownNode } from './types';

	let { node, tableHeader = false }: { node: MarkdownNode; tableHeader?: boolean } = $props();
</script>

{#if node.type === 'root'}
	{#each node.children as child (child.key)}
		<Self node={child} />
	{/each}
{:else if node.type === 'text'}
	{node.value}
{:else if node.type === 'paragraph'}
	<p class="my-3 leading-relaxed first:mt-0 last:mb-0">
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</p>
{:else if node.type === 'heading'}
	<svelte:element
		this={`h${node.depth}`}
		class={[
			'mt-6 mb-3 font-bold tracking-tight first:mt-0',
			node.depth === 1 && 'text-xl',
			node.depth === 2 && 'text-lg',
			node.depth >= 3 && 'text-base'
		]}
	>
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</svelte:element>
{:else if node.type === 'emphasis'}
	<em>
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</em>
{:else if node.type === 'strong'}
	<strong>
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</strong>
{:else if node.type === 'delete'}
	<del>
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</del>
{:else if node.type === 'blockquote'}
	<blockquote class="my-4 border-l-2 border-border pl-4 text-foreground/75">
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</blockquote>
{:else if node.type === 'list'}
	{#if node.ordered}
		<ol class="my-3 list-decimal space-y-1 pl-6" start={node.start ?? undefined}>
			{#each node.children as child (child.key)}
				<Self node={child} />
			{/each}
		</ol>
	{:else}
		<ul class="my-3 list-disc space-y-1 pl-6">
			{#each node.children as child (child.key)}
				<Self node={child} />
			{/each}
		</ul>
	{/if}
{:else if node.type === 'listItem'}
	<li class="pl-1">
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</li>
{:else if node.type === 'inlineCode'}
	<code class="rounded bg-muted px-1 py-0.5 text-[0.92em]">{node.value}</code>
{:else if node.type === 'code'}
	<pre
		class="my-4 overflow-x-auto rounded border border-border bg-muted/50 p-4 text-[12px] leading-relaxed"><code
			>{node.value}</code
		></pre>
{:else if node.type === 'thematicBreak'}
	<hr class="my-5 border-border" />
{:else if node.type === 'link'}
	<svelte:element
		this={'a'}
		href={node.url}
		rel={node.external ? 'noopener noreferrer' : undefined}
		class="underline underline-offset-2 hover:text-foreground"
	>
		{#each node.children as child (child.key)}
			<Self node={child} />
		{/each}
	</svelte:element>
{:else if node.type === 'table'}
	<div class="my-4 overflow-x-auto">
		<table class="w-full border-collapse text-left text-sm">
			{#if node.children[0]}
				<thead>
					<Self node={node.children[0]} tableHeader />
				</thead>
			{/if}
			{#if node.children.length > 1}
				<tbody>
					{#each node.children.slice(1) as child (child.key)}
						<Self node={child} />
					{/each}
				</tbody>
			{/if}
		</table>
	</div>
{:else if node.type === 'tableRow'}
	<tr class="border-b border-border">
		{#each node.children as child (child.key)}
			<Self node={child} {tableHeader} />
		{/each}
	</tr>
{:else if node.type === 'tableCell'}
	{#if tableHeader}
		<th class="border border-border bg-muted/40 px-3 py-2 font-semibold">
			{#each node.children as child (child.key)}
				<Self node={child} />
			{/each}
		</th>
	{:else}
		<td class="border border-border px-3 py-2 align-top">
			{#each node.children as child (child.key)}
				<Self node={child} />
			{/each}
		</td>
	{/if}
{/if}
